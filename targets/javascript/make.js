var path = require('path');

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating JavaScript Combined SDK to " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");

    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));

    for (var i in apis) {
        var apiLocals = {};
        apiLocals.api = apis[i];
        apiLocals.hasResultActions = hasResultActions;
        apiLocals.getRequestActions = getRequestActions;
        apiLocals.getResultActions = getResultActions;
        apiLocals.getUrl = getUrl;
        apiLocals.apiVersion = apis[0].revision;
        apiLocals.sdkVersion = exports.sdkVersion;
        var generatedApi = apiTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFab" + apis[i].name + "Api.js"), generatedApi);
    }
}

function getRequestActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
        return "request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId; if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";\n";
    if (api.name == "Client" && apiCall.auth == 'SessionTicket')
        return "if (PlayFab._internalSettings.sessionTicket == null) throw \"Must be logged in to call this method\";\n"
    if (apiCall.auth == 'SecretKey')
        return "if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.developerSecretKey set to call this method\";\n"
    return "";
}

function hasResultActions(apiCall, api) {
    if (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult")
        return true;
    if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
        return true;
    return false;
}

function getResultActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
        return "if (result != null && result.SessionTicket != null) { PlayFab._internalSettings.sessionTicket = result.SessionTicket; }";
    else if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
        return "PlayFab._internalSettings.logicServerUrl = result.Url;";
    return "";
}

function getUrl(apiCall, api) {
    if (api.name == "Client" && apiCall.name == "RunCloudScript")
        return "PlayFab._internalSettings.getLogicServerUrl()";
    return "PlayFab._internalSettings.getServerUrl() + \"" + apiCall.url + "\"";
}
