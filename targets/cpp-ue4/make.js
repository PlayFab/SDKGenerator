var path = require("path");
var ejs = require("ejs");
var shared = require("./cpp-ue4");
var blueprint = require("./make-bp.js");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var subFolders = ["PlayFabSDK", "ExampleProject"]; // Two copies, one for example project, and one as the raw plugin
    for (var i = 0; i < subFolders.length; i++) {
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var pluginOutputDir = path.resolve(eachApiOutputDir, "Plugins");
        var outputCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFab");
        var blueprintCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFabProxy");
        
        console.log("Generating UE4 C++ combined SDK to " + eachApiOutputDir);
        
        // copy the base plugins files, resource, uplugin, etc
        copyTree(path.resolve(sourceDir, "Plugins"), pluginOutputDir);
        
        for (var a = 0; a < apis.length; a++) {
            shared.makeAPI(apis[a], outputCodeDir, "Core/");
            // generate blueprint boilerplate
            blueprint.MakeBp(apis[a], blueprintCodeDir, "Proxy/");
        }
        
        shared.GenerateModels(apis, outputCodeDir, "All", "Core/");
        shared.GenerateErrors(apis[0], outputCodeDir, "Core/");
        GenerateSettings(apis, sourceDir, outputCodeDir, "Core/");
    }

    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "ExampleProject/Source/ExampleProject"));
}

function GenerateSettings(apis, sourceDir, apiOutputDir, subDir) {
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabSettings.cpp.ejs")));
    
    var settingsLocals = {};
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "Private/" + subDir + "PlayFabSettings.cpp"), generatedSettings);
}
