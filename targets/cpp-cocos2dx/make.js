var path = require("path");
var shared = require("../cpp-shared/cpp-shared");

function copyBaseFiles(sourceDir, apiOutputDir) {
    copyTree(path.resolve(sourceDir, "../cpp-shared/source/dependencies/include/rapidjson"), path.resolve(apiOutputDir, "include/rapidjson"));
    copyTree(path.resolve(sourceDir, "../cpp-shared/source/include"), path.resolve(apiOutputDir, "include"));
    copyTree(path.resolve(sourceDir, "../cpp-shared/source/source/core"), path.resolve(apiOutputDir, "source"));
    copyTree(path.resolve(sourceDir, "../cpp-shared/source/source/curl"), path.resolve(apiOutputDir, "source"));
}

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";
    
    console.log("Generating Cocos2d-x C++ client SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    shared.makeAPI(api, apiOutputDir, "");
    
    shared.generateModels([api], apiOutputDir, libname, "");
    shared.generateErrors(api, apiOutputDir);
    generateVersion(api, sourceDir, apiOutputDir);
    generateSettings([api], sourceDir, apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";
    
    console.log("Generating Cocos2d-x C++ server SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i in apis)
        shared.makeAPI(apis[i], apiOutputDir, "");
    
    shared.generateModels(apis, apiOutputDir, libname, "");
    shared.generateErrors(apis[0], apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
    generateSettings(apis, sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";
    
    console.log("Generating Cocos2d-x C++ combined SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i in apis)
        shared.makeAPI(apis[i], apiOutputDir, "");
    
    shared.generateModels(apis, apiOutputDir, libname, "");
    shared.generateErrors(apis[0], apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
    generateSettings(apis, sourceDir, apiOutputDir);
}

function generateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cpp.ejs")));
    
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabVersion.cpp"), generatedVersion);
}

function generateSettings(apis, sourceDir, apiOutputDir) {
    var settingsTemplateh = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.h.ejs")));
    var settingsTemplateCpp = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cpp.ejs")));
    
    var versionLocals = {};
    versionLocals.hasLogicServer = false;
    versionLocals.hasSecretKey = false;
    for (var i in apis) {
        if (apis[i].name === "Client")
            versionLocals.hasLogicServer = true;
        else
            versionLocals.hasSecretKey = true;
    }
    
    var generatedSettingsH = settingsTemplateh(versionLocals);
    var generatedSettingsCpp = settingsTemplateCpp(versionLocals);
    writeFile(path.resolve(apiOutputDir, "include/playfab/PlayFabSettings.h"), generatedSettingsH);
    writeFile(path.resolve(apiOutputDir, "source/core/PlayFabSettings.cpp"), generatedSettingsCpp);
}
