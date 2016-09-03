var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeClientAPI = function (api, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabClientSdk");
    MakeLuaDistSdk([api], sourceDir, apiOutputDir, "Client");
    copyTree(path.resolve(sourceDir, "testing"), apiOutputDir);
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabClientSdk");
    MakeDefoldSdk([api], sourceDir, apiOutputDir, "DefoldClient");
    copyTree(path.resolve(sourceDir, "testing"), apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabServerSdk");
    MakeLuaDistSdk(apis, sourceDir, apiOutputDir, "Server");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabServerSdk");
    MakeDefoldSdk(apis, sourceDir, apiOutputDir, "DefoldServer");
}

exports.makeCombinedAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabSdk");
    MakeLuaDistSdk(apis, sourceDir, apiOutputDir, "Combined");
    
    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabSdk");
    MakeDefoldSdk(apis, sourceDir, apiOutputDir, "DefoldCombined");
    copyTree(path.resolve(sourceDir, "DefoldBuild"), baseOutputDir);
}

function MakeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    console.log("Generating " + sdkDescriptor + " api\n    from: " + sourceDir + "\n    to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeSimpleFiles(apis, sourceDir, apiOutputDir);
    for (var a = 0; a < apis.length; a++)
        MakeApi(apis[a], sourceDir, apiOutputDir);
}

function MakeLuaDistSdk(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    MakeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor);
    copyTree(path.resolve(sourceDir, "LuaDist"), apiOutputDir);
}

function MakeDefoldSdk(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    MakeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor);
    copyTree(path.resolve(sourceDir, "Defold"), apiOutputDir);
    
    var defoldLocals = {}
    defoldLocals.sdkVersion = exports.sdkVersion;
    defoldLocals.sdkDescriptor = sdkDescriptor;
    
    var projTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Defold/PlayFabSdk.project.ejs")));
    var projGenerated = projTemplate(defoldLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSdk.project"), projGenerated);
    if (sdkDescriptor.indexOf("Client") > -1) {
        var testTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Defold/PlayFabTestExample.project.ejs")));
        var testGenerated = testTemplate(defoldLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFabTestExample.project"), testGenerated);
    }
}

function MakeApi(api, sourceDir, apiOutputDir) {
    var locals = {};
    locals.api = api;
    locals.GenerateSummary = GenerateSummary;
    locals.GetRequestActions = GetRequestActions;
    locals.GetAuthentication = GetAuthentication;
    locals.hasClientOptions = api.name === "Client";
    
    var template = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabApi.lua.ejs")));
    var generatedTemplateText = template(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFab/PlayFab" + api.name + "Api.lua"), generatedTemplateText);
}

function MakeSimpleFiles(apis, sourceDir, apiOutputDir) {
    var locals = {};
    locals.sdkVersion = exports.sdkVersion;
    locals.buildIdentifier = exports.buildIdentifier;
    locals.hasServerOptions = false;
    locals.hasClientOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            locals.hasClientOptions = true;
        else
            locals.hasServerOptions = true;
    }
    
    var template = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.lua.ejs")));
    var generatedTemplateText = template(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFab/PlayFabSettings.lua"), generatedTemplateText);
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
