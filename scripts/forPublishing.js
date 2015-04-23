/**
 * becoming a little defunct
 * but here for backwards compat
 */
function getLibraryInfo () {

  return { 
    info: {
      name:'cGitJsonApi',
      version:'0.0.1',
      key:'M5Z3qjwycVC9Cebh0UEFuIKi_d-phDA33',
      description:'library to interact with git api',
      share:'https://script.google.com/d/1_4RfsIW57fdzWh7T38O9IfGdTRgYbOSyC5PvsOm3a4GU1sxllw8blEUl/edit?usp=sharing'
    },
    dependencies:[
      cUseful.getLibraryInfo(),
      cUrlResult.getLibraryInfo()
    ]
  }; 
}


function showMyScriptAppResource(s) {
  try {
    return ScriptApp.getResource(s);
  }
  catch (err) {
    throw err + " getting script " + s;
  }
}
