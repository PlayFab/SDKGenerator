
var path = require('path');

var sdkVersion = "1.0.1";

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";

    console.log("Generating Unreal Engine " + libname + " SDK to " + apiOutputDir);

    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, 'Source'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab/Source'));

    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, 'StandardPluginFiles'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab'));

    // Make the variable api files
    makeUnrealAPI(api, apiOutputDir, sourceDir, libname);

    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, 'ExampleProject'), path.resolve(apiOutputDir, 'ExampleProject'));
    copyTree(path.resolve(apiOutputDir, 'PluginFiles'), path.resolve(apiOutputDir, 'ExampleProject/Plugins'));

}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";

    console.log("Generating Unreal Engine " + libname + " SDK to " + apiOutputDir);

    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, 'Source'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab/Source'));

    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, 'StandardPluginFiles'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab'));

    // Make the variable api files
    makeUnrealAPI(apis, apiOutputDir, sourceDir, libname);

    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, 'ExampleProject'), path.resolve(apiOutputDir, 'ExampleProject'));
    copyTree(path.resolve(apiOutputDir, 'PluginFiles'), path.resolve(apiOutputDir, 'ExampleProject/Plugins'));

}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";

    console.log("Generating Unreal Engine " + libname + " SDK to " + apiOutputDir);

    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, 'Source'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab/Source'));

    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, 'StandardPluginFiles'), path.resolve(apiOutputDir, 'PluginFiles/PlayFab'));

    // Make the variable api files
    makeUnrealAPI(apis, apiOutputDir, sourceDir, libname);

    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, 'ExampleProject'), path.resolve(apiOutputDir, 'ExampleProject'));
    copyTree(path.resolve(apiOutputDir, 'PluginFiles'), path.resolve(apiOutputDir, 'ExampleProject/Plugins'));
}


function makeUnrealAPI(apis, apiOutputDir, sourceDir, libname) {
        
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var apiCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var apiUpluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var apiPlayFabCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.cpp.ejs")));
    var apiPlayFabModelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.h.ejs")));
    var apiPlayFabModelCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.cpp.ejs")));
    var apiPlayFabUtilitiesHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.h.ejs")));
    var apiPlayFabUtilitiesCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.cpp.ejs")));
    var apiPlayFabModelDecoderHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.h.ejs")));
    var apiPlayFabModelDecoderCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.cpp.ejs")));
    
    // Create the uplugin file
    var versionLocals = {};
    if (Array.isArray(apis))
    {
        versionLocals.apiRevision = apis[0].revision;
    }
    else
    {
        versionLocals.apiRevision = apis.revision;
    }
    versionLocals.sdkVersion = sdkVersion;
    versionLocals.libname = libname;
    versionLocals.apis = apis;

    var generatedUplugin = apiUpluginTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/PlayFab.uplugin"), generatedUplugin);

    var generatedUtilitiesH = apiPlayFabUtilitiesHTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabUtilities.h"), generatedUtilitiesH);

    var generatedUtilitiesCpp = apiPlayFabUtilitiesCppTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFabUtilities.cpp"), generatedUtilitiesCpp);

    var apiLocals = {};
    apiLocals.names = [];
    var api;

    if (Array.isArray(apis))
    {
        for (var i in apis)
        {
            api = apis[i];
            apiLocals.names[i] = {};
            apiLocals.names[i].name = api.name;
        }
    }
    else
    {
        api = apis;
        apiLocals.names[0] = {};
        apiLocals.names[0].name = api.name;
    }
    

    apiLocals.sdkVersion = sdkVersion;
    apiLocals.apiRevision = api.revision;

    var generatedPlayFabCpp = apiPlayFabCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab.cpp"), generatedPlayFabCpp);

    // Create Models, .h and .cpp files
    var apiLocals = {};
    if (Array.isArray(apis))
    {
        for (var i in apis)
        {
            var api = apis[i];

            apiLocals.api = api;

            apiLocals.authKey = api.name == "Client";
            apiLocals.sdkVersion = sdkVersion;
            apiLocals.apiRevision = api.revision;
            apiLocals.libname = libname;

            var generatedHeader = apiHeaderTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), generatedHeader);

            var generatedBody = apiCppTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), generatedBody);

            var generatedHeader = apiPlayFabModelTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "Models.h"), generatedHeader);

            var generatedBody = apiPlayFabModelCppTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "Models.cpp"), generatedBody);

            var generatedHeader = apiPlayFabModelDecoderHTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "ModelDecoder.h"), generatedHeader);

            var generatedBody = apiPlayFabModelDecoderCppTemplate(apiLocals);
            writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "ModelDecoder.cpp"), generatedBody);
        }
    }
    else
    {
        apiLocals.api = apis;

        apiLocals.authKey = api.name == "Client";
        apiLocals.sdkVersion = sdkVersion;
        apiLocals.apiRevision = api.revision;
        apiLocals.libname = libname;

        var generatedHeader = apiHeaderTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), generatedHeader);

        var generatedBody = apiCppTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), generatedBody);

        var generatedHeader = apiPlayFabModelTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "Models.h"), generatedHeader);

        var generatedBody = apiPlayFabModelCppTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "Models.cpp"), generatedBody);

        var generatedHeader = apiPlayFabModelDecoderHTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "ModelDecoder.h"), generatedHeader);

        var generatedBody = apiPlayFabModelDecoderCppTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "ModelDecoder.cpp"), generatedBody);
    }

    
    

}

