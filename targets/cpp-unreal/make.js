var path = require("path");
var ejs = require("ejs");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Client SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    MakeUnrealAPI([api], apiOutputDir, sourceDir, "Client");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor([api], apiOutputDir, sourceDir);
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
    MakeUnrealAPI(apis, apiOutputDir, sourceDir, "Server");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor(apis, apiOutputDir, sourceDir);
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
    MakeUnrealAPI(apis, apiOutputDir, sourceDir, "All");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor(apis, apiOutputDir, sourceDir);
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

function MakeUnrealAPI(apis, apiOutputDir, sourceDir, libname) {
    // Create the uplugin file
    var apiLocals = {};
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.libname = libname;
    apiLocals.apis = apis;
    
    var apiUpluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var generatedUplugin = apiUpluginTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/PlayFab.uplugin"), generatedUplugin);
    
    var apiPlayFabUtilitiesHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.h.ejs")));
    var generatedUtilitiesH = apiPlayFabUtilitiesHTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabUtilities.h"), generatedUtilitiesH);
    
    var apiPlayFabUtilitiesCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.cpp.ejs")));
    var generatedUtilitiesCpp = apiPlayFabUtilitiesCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFabUtilities.cpp"), generatedUtilitiesCpp);
    
    var pfcppLocals = {};
    pfcppLocals.sdkVersion = exports.sdkVersion;
    pfcppLocals.names = [];
    for (var i in apis) {
        pfcppLocals.names[i] = {};
        pfcppLocals.names[i].name = apis[i].name;
    }
    var apiPlayFabCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.cpp.ejs")));
    var generatedPlayFabCpp = apiPlayFabCppTemplate(pfcppLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab.cpp"), generatedPlayFabCpp);
    
    for (var i in apis)
        MakeApiFiles(apis[i], apiOutputDir, sourceDir, libname);
    MakeSimpleFiles(apis, apiOutputDir, sourceDir);
}

function MakePfTestActor(apis, apiOutputDir, sourceDir) {
    var testLocals = {};
    testLocals.hasServerOptions = false;
    testLocals.hasClientOptions = false;
    testLocals.sdkVersion = exports.sdkVersion;
    for (var i in apis) {
        if (apis[i].name === "Client")
            testLocals.hasClientOptions = true;
        else
            testLocals.hasServerOptions = true;
    }
    var testTemplateH = ejs.compile(readFile(path.resolve(sourceDir, "templates/PfTestActor.h.ejs")));
    var generatedH = testTemplateH(testLocals);
    writeFile(path.resolve(apiOutputDir, "ExampleProject/Plugins/PlayFab/Source/PlayFab/Classes/PfTestActor.h"), generatedH);
    
    var testTemplateCpp = ejs.compile(readFile(path.resolve(sourceDir, "templates/PfTestActor.cpp.ejs")));
    var generatedCpp = testTemplateCpp(testLocals);
    writeFile(path.resolve(apiOutputDir, "ExampleProject/Plugins/PlayFab/Source/PlayFab/Private/PfTestActor.cpp"), generatedCpp);
}

// Create Enums, .h file
function MakeSimpleFiles(apis, apiOutputDir, sourceDir) {
    var enumLocals = {
        "enumTypes": CollectEnumsFromApis(apis)
    }
    var enumTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabEnums.h.ejs")));
    var genEnums = enumTemplate(enumLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabEnums.h"), genEnums);
    
    var settingLocals = {
        "sdkVersion": exports.sdkVersion,
        "buildIdentifier": exports.buildIdentifier
    }
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/IPlayFab.h.ejs")));
    var genSettings = settingsTemplate(settingLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Public/IPlayFab.h"), genSettings);
}

// Pull all the enums out of all the apis, and collect them into a single collection of just the enum types and filter duplicates
function CollectEnumsFromApis(apis) {
    var enumTypes = {};
    for (var i in apis)
        for (var dataTypeName in apis[i].datatypes)
            if (apis[i].datatypes[dataTypeName].isenum)
                enumTypes[dataTypeName] = apis[i].datatypes[dataTypeName];
    return enumTypes;
}

// Create Models, .h and .cpp files
function MakeApiFiles(api, apiOutputDir, sourceDir, libname) {
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
