var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeClientAPI = function (api, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabClientSdk");
    MakeLuaDistSdk([api], sourceDir, apiOutputDir, "Client");
    copyTree(path.resolve(sourceDir, "SharedTesting"), apiOutputDir); // SharedTesting in Client only
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabClientSdk");
    MakeDefold([api], sourceDir, apiOutputDir, "DefoldClient");
    copyTree(path.resolve(sourceDir, "SharedTesting"), apiOutputDir); // SharedTesting in Client only
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/client/lua/plugin/playfab/client");
    MakeCorona([api], sourceDir, apiOutputDir, "CoronaClient", "plugin.playfab.client.");
    // Corona testing is copied separately
}

exports.makeServerAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabServerSdk");
    MakeLuaDistSdk(apis, sourceDir, apiOutputDir, "Server");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabServerSdk");
    MakeDefold(apis, sourceDir, apiOutputDir, "DefoldServer");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/server/lua/plugin/playfab/server");
    MakeCorona(apis, sourceDir, apiOutputDir, "CoronaServer", "plugin.playfab.server.");
}

exports.makeCombinedAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabSdk");
    MakeLuaDistSdk(apis, sourceDir, apiOutputDir, "Combined");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabSdk");
    MakeDefold(apis, sourceDir, apiOutputDir, "DefoldCombined");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/combo/lua/plugin/playfab/combo");
    MakeCorona(apis, sourceDir, apiOutputDir, "CoronaCombined", "plugin.playfab.combo.");
    
    copyTree(path.resolve(sourceDir, "GlobalFiles"), baseOutputDir);
}

function MakeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix, sdkVersionString) {
    console.log("Generating " + sdkDescriptor + " api\n    from: " + sourceDir + "\n    to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeSimpleFiles(apis, sourceDir, apiOutputDir, requirePrefix, sdkVersionString);
    for (var a = 0; a < apis.length; a++)
        MakeApi(apis[a], sourceDir, apiOutputDir, requirePrefix);
}

function MakeLuaDistSdk(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    var sdkVersionString = "LuaSdk_" + exports.sdkVersion;
    MakeCoreSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFab"), sdkDescriptor, "PlayFab.", sdkVersionString);
    copyTree(path.resolve(sourceDir, "LuaDist"), apiOutputDir);
}

function MakeDefold(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    var sdkVersionString = "DefoldSdk_" + exports.sdkVersion;
    MakeCoreSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFab"), sdkDescriptor, "PlayFab.", sdkVersionString);
    copyTree(path.resolve(sourceDir, "EachDefold"), apiOutputDir);
    
    var customLocals = {
        sdkVersion: exports.sdkVersion
    }
    customLocals.sdkDescriptor = sdkDescriptor; // sdkDescriptor is only used in Defold Templates
    
    var projTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Defold/PlayFabSdk.project.ejs")));
    var projGenerated = projTemplate(customLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSdk.project"), projGenerated);
    if (sdkDescriptor.indexOf("Client") > -1) {
        var testTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Defold/PlayFabTestExample.project.ejs")));
        var testGenerated = testTemplate(customLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFabTestExample.project"), testGenerated);
    }
}

function MakeCorona(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix) {
    var customLocals = {}
    customLocals.requirePrefix = requirePrefix;
    
    var httpsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Corona/PlayFabHttpsCorona.lua.ejs")));
    var httpsGenerated = httpsTemplate(customLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabHttpsCorona.lua"), httpsGenerated);
    
    var sdkVersionString = "CoronaSdk_" + exports.sdkVersion;
    MakeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix, sdkVersionString); // requirePrefix is mostly for Corona
    copyTree(path.resolve(sourceDir, "EachCorona"), apiOutputDir);
}

function MakeApi(api, sourceDir, apiOutputDir, requirePrefix) {
    var locals = {};
    locals.api = api;
    locals.GenerateSummary = GenerateSummary;
    locals.GetRequestActions = GetRequestActions;
    locals.GetAuthentication = GetAuthentication;
    locals.hasClientOptions = api.name === "Client";
    locals.requirePrefix = requirePrefix; // Corona is in a top-level subfolder which is not present in any other sdk
    
    var template = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabApi.lua.ejs")));
    var generatedTemplateText = template(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.lua"), generatedTemplateText);
}

function MakeSimpleFiles(apis, sourceDir, apiOutputDir, requirePrefix, sdkVersionString) {
    var locals = {};
    locals.buildIdentifier = exports.buildIdentifier;
    locals.sdkVersionString = sdkVersionString;
    locals.hasServerOptions = false;
    locals.hasClientOptions = false;
    locals.requirePrefix = requirePrefix; // Corona is in a top-level subfolder which is not present in any other sdk
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            locals.hasClientOptions = true;
        else
            locals.hasServerOptions = true;
    }
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.lua.ejs")));
    var genSettings = settingsTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.lua"), genSettings);
    
    var ihttpTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/IPlayFabHttps.lua.ejs")));
    var genIHttp = ihttpTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "IPlayFabHttps.lua"), genIHttp);
}

function GenerateSummary(tabbing, element, summaryParam) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    var output = tabbing + "-- " + element[summaryParam] + "\n";
    if (element.hasOwnProperty("url")) {
        var apiName = element.url.split("/")[1];
        output += tabbing + "-- API Method Documentation: https://api.playfab.com/Documentation/" + apiName + "/method/" + element.name + "\n";
        if (element.hasOwnProperty("request"))
            output += tabbing + "-- Request Documentation: https://api.playfab.com/Documentation/" + apiName + "/datatype/PlayFab." + apiName + ".Models/PlayFab." + apiName + ".Models." + element.request + "\n";
        if (element.hasOwnProperty("result"))
            output += tabbing + "-- Result Documentation: https://api.playfab.com/Documentation/" + apiName + "/datatype/PlayFab." + apiName + ".Models/PlayFab." + apiName + ".Models." + element.result + "\n";
    }
    return output;
}

function GetRequestActions(tabbing, apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return tabbing + "request.TitleId = PlayFabSettings.settings.titleId\n" 
            + tabbing + "local externalOnSuccess = onSuccess\n" 
            + tabbing + "function wrappedOnSuccess(result)\n" 
            + tabbing + "    PlayFabSettings._internalSettings.sessionTicket = result.SessionTicket\n" 
            + tabbing + "    if (externalOnSuccess) then\n" 
            + tabbing + "        externalOnSuccess(result)\n" 
            + tabbing + "    end\n" 
            + tabbing + "    PlayFabClientApi._MultiStepClientLogin(result.SettingsForUser.NeedsAttribution)\n" 
            + tabbing + "end\n" 
            + tabbing + "onSuccess = wrappedOnSuccess\n";
    if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return tabbing + "if (not PlayFabClientApi.IsClientLoggedIn()) then error(\"Must be logged in to call this method\") end\n" 
            + tabbing + "PlayFabSettings.settings.advertisingIdType = PlayFabSettings.settings.advertisingIdType .. \"_Successful\"\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return tabbing + "if (not PlayFabClientApi.IsClientLoggedIn()) then error(\"Must be logged in to call this method\") end\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (not PlayFabSettings.settings.titleId or not PlayFabSettings.settings.devSecretKey) then error(\"Must have PlayFabSettings.settings.devSecretKey set to call this method\") end\n";
    return "";
}

function GetAuthentication(apiCall) {
    if (apiCall.auth === "None")
        return "nil, nil";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings._internalSettings.sessionTicket";
    else if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.settings.devSecretKey";
    return "";
}
