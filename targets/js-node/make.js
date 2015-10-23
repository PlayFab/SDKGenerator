var path = require('path');
exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Node.js combined SDK to " + apiOutputDir);
    
    // Load the templates
    var templateDir = path.resolve(sourceDir, "templates");
    var coreTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "api.js.ejs")));
    
    var destSubFolders = ["PlayFabSdk", "PlayFabTesting"]; // Write both the published folder and the testing folder
    for (var folderIndex in destSubFolders) {
        var eachOutputDir = path.resolve(apiOutputDir, destSubFolders[folderIndex])
        
        // Write the core functionality file
        var coreLocals = {};
        coreLocals.apiVersion = apis[0].revision;
        coreLocals.sdkVersion = exports.sdkVersion;
        var generatedCore = coreTemplate(coreLocals);
        writeFile(path.resolve(eachOutputDir, "PlayFab.js"), generatedCore);
        
        // Write the API files
        for (var i in apis) {
            var apiLocals = {};
            apiLocals.api = apis[i];
            apiLocals.getAuthParams = getAuthParams;
            apiLocals.getRequestActions = getRequestActions;
            apiLocals.getResultActions = getResultActions;
            apiLocals.getUrlAccessor = getUrlAccessor;
            var generatedApi = apiTemplate(apiLocals);
            writeFile(path.resolve(eachOutputDir, "PlayFab" + apis[i].name + ".js"), generatedApi);
        }
    }
}

function getAuthParams(apiCall) {
    if (apiCall.auth == 'SecretKey')
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    else if (apiCall.auth == 'SessionTicket')
        return "\"X-Authorization\", PlayFab.settings.sessionTicket";
    
    return "null, null";
}

function getRequestActions(numSpaces, apiCall, api) {
    var output = "";
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
        output = "request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId;\n    if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";\n";
    if (api.name == "Client" && apiCall.auth == 'SessionTicket')
        output = "if (PlayFab.settings.sessionTicket == null) throw \"Must be logged in to call this method\";\n"
    if (apiCall.auth == 'SecretKey')
        output = "if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.DeveloperSecretKey set to call this method\";\n"
    
    if (output.length > 0) {
        spaces = "";
        for (var i = 0; i < numSpaces; i++)
            spaces += " ";
        output = spaces + output;
    }
    
    return output;
}

function getResultActions(numSpaces, apiCall, api) {
    var output = "";
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
        output = "PlayFab.settings.sessionTicket = result != null && result.data.hasOwnProperty(\"SessionTicket\") ? result.data.SessionTicket : PlayFab.settings.sessionTicket;\n";
    else if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
        output = "PlayFab.settings.logicServerUrl = result != null && result.data.hasOwnProperty(\"Url\") ? result.data.Url : PlayFab.settings.logicServerUrl;\n";
    
    if (output.length > 0) {
        spaces = "";
        for (var i = 0; i < numSpaces; i++)
            spaces += " ";
        output = spaces + output;
    }
    
    return output;
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType == 'logic')
        return "PlayFab.GetLogicServerUrl()";
    return "PlayFab.GetServerUrl()";
}
