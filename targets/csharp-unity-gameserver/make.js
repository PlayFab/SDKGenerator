var path = require("path");
var ejs = require("ejs");
var unityV2 = require("../unity-v2/make.js");

exports.putInRoot = true;

// Build the SDK into the gameserver and example-client, as they'd appear if taken from nightly
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    MakeSdk(apis, sourceDir, path.resolve(apiOutputDir, "GameServerSource/Assets/PlayFabSDK")); // GameServer
    MakeSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFabGameServerClientExample/Assets/PlayFabSDK")); // Client Example
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var gameServerApis = [];
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name.toLowerCase().indexOf("admin") === -1) {
            gameServerApis.push(apis[i]);
        }
    }
    
    MakeStrangeIoC(gameServerApis, sourceDir, path.resolve(apiOutputDir, "GameServerSource/Assets/Packages/DefaultPackages/PlayFabContext/"));
}

function MakeSdk(apis, sourceDir, apiOutputDir) {
    sourceDir = path.resolve(sourceDir, "../unity-v2");
    unityV2.MakeUnityV2Sdk(apis, sourceDir, apiOutputDir);
}

function MakeStrangeIoC(apis, sourceDir, apiOutputDir) {
    console.log("  - Generating C-sharp Unity StrangeIoC Wrapper client to\n  -> " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    
    MakeSignals(apis, templateDir, apiOutputDir);
    MakeCommands(apis, templateDir, apiOutputDir);
    MakeContext(apis, templateDir, apiOutputDir);
    MakeErrorHandler(templateDir, apiOutputDir);
}

function MakeErrorHandler(templateDir, apiOutputDir) {
    console.log("   - Generating C# Error Handler library to\n   -> " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "PlayFabErrorHandler.cs.ejs")));
    var locals = {};
    var generatedApi = apiTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "ErrorHandler/PlayFabErrorHandler.cs"), generatedApi);
}

function MakeSignals(apis, templateDir, apiOutputDir) {
    console.log("   - Generating C# Signals library to\n   -> " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "PlayFabSignals.cs.ejs")));
    var locals = {};
    locals.apis = apis;
    var generatedApi = apiTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "Signals/PlayFabSignals.cs"), generatedApi);
}

function MakeCommands(apis, templateDir, apiOutputDir) {
    console.log("   - Generating C# Commands library to\n   -> " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "PlayFabCommands.cs.ejs")));
    var locals = {};
    locals.apis = apis;
    var generatedApi = apiTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "Commands/PlayFabCommands.cs"), generatedApi);
}

function MakeContext(apis, templateDir, apiOutputDir) {
    console.log("   - Generating C# Context library to\n   -> " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "PlayFabContextManager.cs.ejs")));
    var locals = {};
    locals.apis = apis;
    locals.GenerateSummary = GenerateSummary;
    var generatedApi = apiTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFabContextManager.cs"), generatedApi);
}

function GenerateSummary(tabbing, element, summaryParam) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    return tabbing + "/// <summary>\n" 
        + tabbing + "/// " + element[summaryParam] + "\n" 
        + tabbing + "/// </summary>\n";
}
