"use strict";
/**
* this the apps script/GIT Interactor
* see the SETTINGS script to tweak
*
* for processing git stuff with extractsource
* @param {object} settings parameters for git interaction
* @return {GasGit} self
*/

/* example settings
* { git: {
*   userAgent : "brucemcpherson",
*   committer: "brucemcpherson"
*   }
* }
*/
function cGitJsonApi (settings) {
  var ENUMS =  { 
    MIMES: {
      API:"application/vnd.github.v3+json",
      CONTENT:"application/vnd.github.VERSION.raw"
    }    
  };
  
  var self = this;
  
  /** 
  * if you are using ezyauth2 this is usually set by 
  * DriverJsonApi.setAccessToken(doGetPattern({} , constructConsentScreen, function (token) { return token; },'script'))
  */
  self.accessToken= null;
  
  
  self.getEnums = function () {
    return ENUMS;
  };
  
  /**
  * get views
  * @param {string} owner
  * @param {string} repo
  * @return {object} standard result object
  */
  self.getTrafficViews = function (owner , repo ) {
    return self.getUnpaged (self.apiBase() + "/repos/" + owner + "/" + repo + "/traffic/views", self.accessToken , self.apiOptions());
  };
  
  
  /**
  * get comments
  * @param {string} owner
  * @param {string} repo
  * @return {object} standard result object
  */
  self.getCommitActivity = function (owner , repo ) {
    return self.getUnpaged (self.apiBase() + "/repos/" + owner + "/" + repo + "/stats/commit_activity", self.accessToken , self.apiOptions());
  };
  
  /**
  * get clones
  * @param {string} owner
  * @param {string} repo
  * @return {object} standard result object
  */
  self.getClones = function (owner , repo ) {
    return self.getUnpaged (self.apiBase() + "/repos/" + owner + "/" + repo + "/traffic/clones", self.accessToken , self.apiOptions());
  };
  
  
  /**
  * set the access token we'll use for accessing drive dapi
  * @param {string} accessToken
  * @return self
  */
  self.setAccessToken = function (accessToken) {
    if (!accessToken) throw 'accesstoken is not defined';
    self.accessToken = accessToken;
    return self;
  };
  
  /**
  * get all my repos
  * @return {object} standard result object
  */
  self.getMyRepos = function() {
    return self.getUnpaged (self.apiBase() + "/user/repos" ,self.accessToken,self.apiOptions());
  }
  
  /**
  * get a file by path and repo
  * @param {string} path a path
  * @param {object} repoObject a repo
  * @return {object} standard result object
  */
  self.getFileByPath = function (path,repoObject) {
    // gets a file by path
    var result = cUrlResult.urlGet (
      repoObject.contents_url.replace("{+path}",path),
      self.accessToken, self.contentOptions());
    
    // do the base64 connversion
    if (result.success & result.data) {
      result.content = cUseful.b64ToString (result.content);
    }
    
    return result;
  };
  
  
  /**
  * get intercept to deal with pagination
  * @param {string} url
  * @param {string} accessToken
  * @param {object} options
  * @param {Array.object} data so far
  * @return {object} standard result object
  */
  self.getUnpaged = function (url,accessToken,options,data) {
    
    // a 202 for the github api means the result isn't quite ready yet
    
    data = data || [];
    var result = cUrlResult.urlGet(url,accessToken,options,function (response,attempt) {
      try {
        return response && response.getResponseCode() === 202;
      }
      catch(err) {
        return false;
      }
    });
    
    // need to recurse for multiple pages
    if (result.success) {
      // some return objects
      if (!Array.isArray (result.data)) {
        result.data = [result.data];
      }
      result.data = cUseful.arrayAppend(data,result.data);
      var h = result.headers.Link;
      
      if(h) {
        var link = /<([^>]*)>;\s?rel="next"/.exec(h);
        if(link) {
          var newUrl = link[1].toString();
          self.getUnpaged ( newUrl , accessToken, options , result.data);
        }
      }  
      
    }
    
    return result;
    
  } 
  
  /**
  * create a repo
  * @param {string} name repo name
  * @param {object} optOptions any additional options
  * @return {object} standard result object
  */
  self.createRepo = function (name , optOptions) {
    
    // default options
    var payload = cUseful.extend( {
      "name": name,
      "description": name + ' created by GitJsonApi automation',
      "homepage": "http://www.mcpher.com",
      "private": false,
      "has_issues": true,
      "has_wiki": true,
      "has_downloads": true
    } , optOptions);
    
    // create it
    return cUrlResult.urlPost(self.apiBase() + "/user/repos", payload, "POST" , self.accessToken,self.apiOptions());
  };
  
  /**
  * special options for the api
  * @return {object} options
  */
  self.contentOptions = function() {
    return cUseful.extend ( {contentType:  self.getEnums().MIMES.CONTENT }, self.apiOptions());
  }; 
  /**
  * special options for the api
  * @return {object} options
  */
  self.apiOptions = function() {
    return {"headers": {
      "accept" : self.getEnums().MIMES.API ,
      "User-Agent" : settings.git.userAgent
    } };
  }; 
  /**
  * function the api base url
  * @return {string} the api base url
  */
  self.apiBase = function () {
    return "https://api.github.com";
  };
  
  
  /**
  * commit a file
  * @param {string} path the file path
  * @param {object} repo the repo object
  * @param {string} message a committ message
  * @param {string} content some content
  * @return {object} standard result
  */
  self.commitFile = function (path,repoObject, message, content) {
    
    //do a get first to see if it exists.....
    var f = self.getFileByPath(path,repoObject);
    
    var options = cUseful.extend ( {
      message: message,
      committer:settings.git.committer, 
      content: Utilities.base64Encode(content)
    }, 
                                  f.success ? {
                                    sha: f.data.sha
                                  } : {});
    
    // writes a text files to a repo
    return cUrlResult.urlPost (repoObject.contents_url.replace("{+path}",path), options, 
                               "PUT", self.accessToken, self.contentOptions(),
                               function (expResult) {
                                 // this is a checker to force an exponential backoff even if there isnt an http error thrown.
                                 // specifically to address this github http://stackoverflow.com/questions/19576601/github-api-issue-with-file-upload
                                 
                                 var code = expResult.getResponseCode();
                                 
                                 if (409  === code) {
                                   throw cUseful.TRYAGAIN;
                                 }
                                 return expResult;
                               }
                              );
    
  };
  
  /**
  * get a file and commit it
  * @param {string} fileContent the file content
  * @param {string} fileName the file name
  * @param {object} repo the repo object
  * @param {string} message a message
  * @return {object} standard result
  */
  self.getAndCommitAFile = function (content , fileName ,repo,message) {    
    
    var result = self.commitFile (
      fileName,
      repo, 
      message || "updated by GitJsonApi automation",
      content
    );
    
    if (!result.success) {
      throw 'failed to commite ' + fileName + ' for ' + repo.name + JSON.stringify(result);
    }
    return result;
  };
  /**
  * use github api to render a markdown doc as html
  * @param {string} content the content
  * @retrn {object} a standard result object
  */
  self.markdownRender = function (content) {
    
    return cUrlResult.urlPost(self.apiBase() + "/markdown", {
      text: content,
      mode:"markdown"
    } );
    
  };
  
  return self;
  
}



