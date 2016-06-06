var path = require("path");
exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Node.js combined SDK to " + apiOutputDir);
    
    // Load the templates
    var templateDir = path.resolve(sourceDir, "templates");
    var coreTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));
    var npmTemplate = ejs.compile(readFile(path.resolve(templateDir, "package.json.ejs")));
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "api.js.ejs")));
    
    var destSubFolders = ["PlayFabSdk", "PlayFabTesting"]; // Write both the published folder and the testing folder
    for (var folderIndex in destSubFolders) {
        var eachOutputDir = path.resolve(apiOutputDir, destSubFolders[folderIndex]);
        
        // Write the core functionality file
        var coreLocals = {};
        coreLocals.sdkVersion = exports.sdkVersion;
        coreLocals.buildIdentifier = exports.buildIdentifier;
        coreLocals.hasServerOptions = false;
        coreLocals.hasClientOptions = false;
        for (var i in apis) {
            if (apis[i].name === "Client")
                coreLocals.hasClientOptions = true;
            else
                coreLocals.hasServerOptions = true;
        }
        var generatedCore = coreTemplate(coreLocals);
        writeFile(path.resolve(eachOutputDir, "PlayFab.js"), generatedCore);
        
        // Write the package file
        var pkgLocals = {}
        pkgLocals.isTesting = (destSubFolders[folderIndex] === "PlayFabTesting");
        pkgLocals.sdkVersion = exports.sdkVersion;
        pkgLocals.projectName = pkgLocals.isTesting ? "playfab-testing" : "playfab-sdk";
        pkgLocals.description = pkgLocals.isTesting ? "Playfab SDK automated testing example" : "Playfab SDK for node.js applications";
        pkgLocals.mainFile = pkgLocals.isTesting ? "PlayFabApiTests.js" : "main.js";
        var generatedPkg = npmTemplate(pkgLocals);
        writeFile(path.resolve(eachOutputDir, "package.json"), generatedPkg);
        
        // Write the API files
        var apiLocals = {};
        apiLocals.getAuthParams = getAuthParams;
        apiLocals.getRequestActions = getRequestActions;
        apiLocals.getResultActions = getResultActions;
        apiLocals.getUrlAccessor = getUrlAccessor;
        for (var i in apis) {
            apiLocals.api = apis[i];
            apiLocals.hasServerOptions = apis[i].name !== "Client";
            apiLocals.hasClientOptions = apis[i].name === "Client";
            var generatedApi = apiTemplate(apiLocals);
            writeFile(path.resolve(eachOutputDir, "PlayFab" + apis[i].name + ".js"), generatedApi);
        }
    }
    
    // Copy testing files
    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "PlayFabTesting"));
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFab._internalSettings.sessionTicket";
    
    return "null, null";
}

function getRequestActions(numSpaces, apiCall, api) {
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        output = "request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId;\n    if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        output = "if (PlayFab._internalSettings.sessionTicket == null) throw \"Must be logged in to call this method\";";
    if (apiCall.auth === "SecretKey")
        output = "if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.DeveloperSecretKey set to call this method\";\n";
    
    if (output.length > 0) {
        var spaces = "";
        for (var i = 0; i < numSpaces; i++)
            spaces += " ";
        output = spaces + output;
    }
    
    return output;
}

function getResultActions(numSpaces, apiCall, api) {
    var spaces = "";
    for (var i = 0; i < numSpaces; i++)
        spaces += " ";
    
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        output = spaces + "if (result != null && result.data != null) {\n"
            + spaces + "    PlayFab._internalSettings.sessionTicket = result.data.hasOwnProperty(\"SessionTicket\") ? result.data.SessionTicket : PlayFab._internalSettings.sessionTicket;\n"
            + spaces + "    exports._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n"
            + spaces + "}";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        output = spaces + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + spaces + "PlayFab.settings.advertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        output = spaces + "PlayFab._internalSettings.logicServerUrl = result != null && result.data.hasOwnProperty(\"Url\") ? result.data.Url : PlayFab._internalSettings.logicServerUrl;\n";
    
    return output;
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFab.GetLogicServerUrl()";
    return "PlayFab.GetServerUrl()";
}
