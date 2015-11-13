var path = require('path');
var shared = require('../cpp-shared/cpp-shared');

function copyBaseFiles(sourceDir, apiOutputDir) {
    copyTree(path.resolve(sourceDir, '../cpp-shared/source/dependencies/include/rapidjson'), path.resolve(apiOutputDir, 'PlayFabSDK/include/rapidjson'));
    copyTree(path.resolve(sourceDir, '../cpp-shared/source/include'), path.resolve(apiOutputDir, 'PlayFabSDK/include'));
    copyTree(path.resolve(sourceDir, '../cpp-shared/source/source/core'), path.resolve(apiOutputDir, 'PlayFabSDK/source'));
    copyTree(path.resolve(sourceDir, '../cpp-shared/source/source/curl'), path.resolve(apiOutputDir, 'PlayFabSDK/source'));
}

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";
    
    console.log("Generating Cocos2d-x C++ client SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    
    var sdkOutputDir = path.resolve(apiOutputDir, 'PlayFabSDK');
    
    shared.makeAPI(api, sdkOutputDir, "");
    
    shared.generateModels([api], sdkOutputDir, libname, "");
    
    shared.generateErrors(api, sdkOutputDir);
    generateVersion(api, sourceDir, apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";
    
    console.log("Generating Cocos2d-x C++ server SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    
    var sdkOutputDir = path.resolve(apiOutputDir, 'PlayFabSDK');
    
    for (var i in apis) {
        var api = apis[i];
        
        shared.makeAPI(api, sdkOutputDir, "");
    }
    
    shared.generateModels(apis, sdkOutputDir, libname, "");
    
    shared.generateErrors(apis[0], sdkOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";
    
    console.log("Generating Cocos2d-x C++ combined SDK to " + apiOutputDir);
    
    copyBaseFiles(sourceDir, apiOutputDir);
    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    
    var sdkOutputDir = path.resolve(apiOutputDir, 'PlayFabSDK');
    
    for (var i in apis) {
        var api = apis[i];
        
        shared.makeAPI(api, sdkOutputDir, "");
    }
    
    shared.generateModels(apis, sdkOutputDir, libname, "");
    
    shared.generateErrors(apis[0], sdkOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
}



function generateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cpp.ejs")));
    
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK/source/PlayFabVersion.cpp"), generatedVersion);
}
