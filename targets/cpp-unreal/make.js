
var path = require('path');

var sdkVersion = "1.0.3";


exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Client";

    console.log("Generating Unreal Engine SDK to " + apiOutputDir);

    // Copy over the standard source files
    copyTree(path.resolve(sourceDir, 'Source'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab/Source'));

    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, 'StandardPluginFiles'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab'));

    // Make the variable api files
    makeUnrealAPI(apis, apiOutputDir, sourceDir);

    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, 'ExampleProject'), path.resolve(apiOutputDir, 'ExampleProject'));
    copyTree(path.resolve(apiOutputDir, 'PluginFiles'), path.resolve(apiOutputDir, 'ExampleProject/Plugins'));
}


function makeUnrealAPI(apis, apiOutputDir, sourceDir) {
        
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var apiCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var apiUpluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var apiPlayFabCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.cpp.ejs")));
    
    // Create the uplugin file
    var versionLocals = {};
    versionLocals.apiRevision = apis[0].revision;
    versionLocals.sdkRevision = sdkVersion;

    var generatedUplugin = apiUpluginTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/PlayFab.uplugin"), generatedUplugin);

    var apiLocals = {};
    apiLocals.names = [];

    for (var i in apis)
    {
        var api = apis[i];
        apiLocals.names[i] = {};
        apiLocals.names[i].name = api.name;
    }

    apiLocals.sdkVersion = sdkVersion;
    apiLocals.apiRevision = api.revision;

    var generatedPlayFabCpp = apiPlayFabCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab.cpp"), generatedPlayFabCpp);

    // Create .h and .cpp files
    for (var i in apis)
    {
        var api = apis[i];

        var apiLocals = {};
        apiLocals.api = api;
        
        apiLocals.authKey = api.name == "Client";
        apiLocals.sdkVersion = sdkVersion;
        apiLocals.apiRevision = api.revision;

        var generatedHeader = apiHeaderTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), generatedHeader);

        var generatedBody = apiCppTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), generatedBody);

    }

}

