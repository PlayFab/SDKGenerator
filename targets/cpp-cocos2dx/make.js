var path = require("path");
var shared = require("./cpp-shared");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";
    
    console.log("Generating Cocos2d-x C++ client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    shared.makeAPI(api, apiOutputDir);
    
    shared.generateModels([api], apiOutputDir, libname);
    shared.generateErrors(api, apiOutputDir);
    GenerateSettings([api], sourceDir, apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";
    
    console.log("Generating Cocos2d-x C++ server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++)
        shared.makeAPI(apis[i], apiOutputDir);
    
    shared.generateModels(apis, apiOutputDir, libname);
    shared.generateErrors(apis[0], apiOutputDir);
    GenerateSettings(apis, sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";
    
    console.log("Generating Cocos2d-x C++ combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++)
        shared.makeAPI(apis[i], apiOutputDir);
    
    shared.generateModels(apis, apiOutputDir, libname);
    shared.generateErrors(apis[0], apiOutputDir);
    GenerateSettings(apis, sourceDir, apiOutputDir);
}

function GenerateSettings(apis, sourceDir, apiOutputDir) {
    var settingsTemplateh = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.h.ejs")));
    var settingsTemplateCpp = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cpp.ejs")));
    
    var settingsLocals = {};
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    settingsLocals.hasClientOptions = false;
    settingsLocals.hasServerOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettingsH = settingsTemplateh(settingsLocals);
    var generatedSettingsCpp = settingsTemplateCpp(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.h"), generatedSettingsH);
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.cpp"), generatedSettingsCpp);
}
