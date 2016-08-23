var ejs = require("ejs");
var path = require("path");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating JavaScript Combined SDK to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));
    copyTree(path.resolve(sourceDir, "source"), path.resolve(apiOutputDir, ".."));
    
    var apiLocals = {};
    apiLocals.HasResultActions = HasResultActions;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetUrl = GetUrl;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.buildIdentifier = exports.buildIdentifier;
    for (var i = 0; i < apis.length; i++) {
        apiLocals.api = apis[i];
        apiLocals.hasServerOptions = apis[i].name !== "Client"; // NOTE FOR THE EJS FILE: PlayFab.settings and PlayFab._internalSettings and are still global/shared - Only utilize this within the api-specific section
        apiLocals.hasClientOptions = apis[i].name === "Client"; // NOTE FOR THE EJS FILE: PlayFab.settings and PlayFab._internalSettings and are still global/shared - Only utilize this within the api-specific section
        var generatedApi = apiTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFab" + apis[i].name + "Api.js"), generatedApi);
    }
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "        request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId; if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "        if (PlayFab._internalSettings.sessionTicket == null) throw \"Must be logged in to call this method\";\n";
    if (apiCall.auth === "SecretKey")
        return "        if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.developerSecretKey set to call this method\";\n";
    return "";
}

function HasResultActions(apiCall, api) {
    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return true;
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return true;
    if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return true;
    return false;
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "            if (result != null && result.data.SessionTicket != null) {\n" 
            + "                PlayFab._internalSettings.sessionTicket = result.data.SessionTicket;\n" 
            + "                PlayFab.ClientApi._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n" 
            + "            }";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "            // Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "            PlayFab.settings.advertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "            PlayFab._internalSettings.logicServerUrl = result.data.Url;";
    return "";
}

function GetUrl(apiCall, api) {
    if (api.name === "Client" && apiCall.name === "RunCloudScript")
        return "PlayFab._internalSettings.GetLogicServerUrl() + \"" + apiCall.url + "\"";
    return "PlayFab._internalSettings.GetServerUrl() + \"" + apiCall.url + "\"";
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFab._internalSettings.sessionTicket";
    return "null, null";
}

function GetDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "/**\n" 
            + tabbing + " * @deprecated Please use " + apiObj.deprecation.ReplacedBy + " instead. \n" 
            + tabbing + " */\n";
    else if (isDeprecated)
        return tabbing + "/**\n" 
            + tabbing + " * @deprecated Do not use\n" 
            + tabbing + " */\n";
    return "";
}
