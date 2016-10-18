var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating cloudscript-ts Server SDK to " + apiOutputDir);


    //Get only the server api because this is for CloudScript (only has access to serverAPI)
    var serverAPI = apis.filter(api => api.name == 'Server')[0];
    console.log("Test api is: " + serverAPI.name)

    //Load API template
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "api.js.ejs")));

    //Generate the api against the template
    var apiLocals = {
      api : serverAPI
    };
    var generatedApi = apiTemplate(apiLocals);

    //Write out the template
    var outputDir = path.resolve(apiOutputDir, "PlayFabSdk");
    writeFile(path.resolve(outputDir, "CloudScript.d.ts"), generatedApi);

}
