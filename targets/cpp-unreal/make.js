var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Client SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    makeUnrealAPI(api, apiOutputDir, sourceDir, "Client");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Server SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    makeUnrealAPI(apis, apiOutputDir, sourceDir, "Server");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Combined SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    makeUnrealAPI(apis, apiOutputDir, sourceDir, "All");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

function makeUnrealAPI(apis, apiOutputDir, sourceDir, libname) {
    // Create the uplugin file
    var versionLocals = {};
    versionLocals.sdkVersion = exports.sdkVersion;
    versionLocals.libname = libname;
    versionLocals.apis = apis;
    
    var apiUpluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var generatedUplugin = apiUpluginTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/PlayFab.uplugin"), generatedUplugin);
    
    var apiPlayFabUtilitiesHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.h.ejs")));
    var generatedUtilitiesH = apiPlayFabUtilitiesHTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabUtilities.h"), generatedUtilitiesH);
    
    var apiPlayFabUtilitiesCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.cpp.ejs")));
    var generatedUtilitiesCpp = apiPlayFabUtilitiesCppTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFabUtilities.cpp"), generatedUtilitiesCpp);
    
    var pfcppLocals = {};
    pfcppLocals.sdkVersion = exports.sdkVersion;
    pfcppLocals.names = [];
    if (Array.isArray(apis)) {
        for (var i in apis) {
            pfcppLocals.names[i] = {};
            pfcppLocals.names[i].name = apis[i].name;
        }
    }
    else {
        pfcppLocals.names[0] = {};
        pfcppLocals.names[0].name = apis.name;
    }
    var apiPlayFabCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.cpp.ejs")));
    var generatedPlayFabCpp = apiPlayFabCppTemplate(pfcppLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab.cpp"), generatedPlayFabCpp);
    
    if (Array.isArray(apis))
        for (var i in apis)
            makeApiFiles(apis[i], apiOutputDir, sourceDir, libname);
    else
        makeApiFiles(apis, apiOutputDir, sourceDir, libname);
}

// Create Models, .h and .cpp files
function makeApiFiles(api, apiOutputDir, sourceDir, libname) {
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var apiCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var apiPlayFabModelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.h.ejs")));
    var apiPlayFabModelCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.cpp.ejs")));
    var apiPlayFabModelDecoderHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.h.ejs")));
    var apiPlayFabModelDecoderCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.cpp.ejs")));
    
    var generatedHeader;
    var generatedBody;
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.hasClientOptions = api.name === "Client";
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.libname = libname;
    
    generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), generatedHeader);
    generatedBody = apiCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), generatedBody);
    
    generatedHeader = apiPlayFabModelTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "Models.h"), generatedHeader);
    generatedBody = apiPlayFabModelCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "Models.cpp"), generatedBody);
    
    generatedHeader = apiPlayFabModelDecoderHTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "ModelDecoder.h"), generatedHeader);
    generatedBody = apiPlayFabModelDecoderCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "ModelDecoder.cpp"), generatedBody);
}
