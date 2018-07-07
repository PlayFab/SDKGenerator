var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating JavaScript Combined SDK to " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_Api.js.ejs"));
    var apiTypingTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_Api.d.ts.ejs"));
    var packageTemplate = getCompiledTemplate(path.resolve(templateDir, "package.json.ejs"));

    var apiLocals = {
        apis: apis,
        generateApiSummary: generateApiSummary,
        getAuthParams: getAuthParams,
        getDeprecationAttribute: getDeprecationAttribute,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getUrl: getUrl,
        generateDatatype: generateDatatype,
        hasResultActions: hasResultActions,
        buildIdentifier: exports.buildIdentifier,
        sdkVersion: exports.sdkVersion,
        sourceDir: sourceDir
    };

    var destSubFolders = ["PlayFabSdk", "PlayFabTestingExample"]; // Write both the published folder and the testing folder
    for (var fIdx = 0; fIdx < destSubFolders.length; fIdx++) {
        var eachOutputDir = path.resolve(apiOutputDir, destSubFolders[fIdx]);

        makeSimpleTemplates(apis, templateDir, eachOutputDir);

        for (var i = 0; i < apis.length; i++) {
            apiLocals.api = apis[i];
            apiLocals.hasClientOptions = apis[i].name === "Client"; // NOTE FOR THE EJS FILE: PlayFab.settings and PlayFab._internalSettings and are still global/shared - Only utilize this within the api-specific section

            writeFile(path.resolve(eachOutputDir, "src/PlayFab/PlayFab" + apis[i].name + "Api.js"), apiTemplate(apiLocals));
            writeFile(path.resolve(eachOutputDir, "src/Typings/PlayFab/PlayFab" + apis[i].name + "Api.d.ts"), apiTypingTemplate(apiLocals));
            if (destSubFolders[fIdx] !== "PlayFabTestingExample")
                writeFile(path.resolve(eachOutputDir, "package.json"), packageTemplate(apiLocals));
        }
    }

    // Copy testing files
    templatizeTree(apiLocals, path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "PlayFabTestingExample"));
}

function makeSimpleTemplates(apis, templateDir, apiOutputDir) {
    var apiLocals = {
        apis: apis
    };
    var coreTyping = getCompiledTemplate(path.resolve(templateDir, "PlayFab.d.ts.ejs"));
    var genCoreTypings = coreTyping(apiLocals);
    writeFile(path.resolve(apiOutputDir, "src/Typings/PlayFab/Playfab.d.ts"), genCoreTypings);
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "var authKey = null; var authValue = null;\n"
            + tabbing + "if (!authKey && PlayFab._internalSettings.sessionTicket) { authKey = \"X-Authorization\"; authValue = PlayFab._internalSettings.sessionTicket; }\n"
            + tabbing + "if (!authKey && PlayFab.settings.developerSecretKey) { authKey = \"X-SecretKey\"; authValue = PlayFab.settings.developerSecretKey; }\n";
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request.TitleId = PlayFab.settings.titleId ? PlayFab.settings.titleId : request.TitleId; if (!request.TitleId) throw PlayFab._internalSettings.errorTitleId;\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if (!PlayFab._internalSettings.entityToken) throw PlayFab._internalSettings.errorEntityToken;\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "if (!PlayFab._internalSettings.sessionTicket) throw PlayFab._internalSettings.errorLoggedIn;\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (!PlayFab.settings.developerSecretKey) throw PlayFab._internalSettings.errorSecretKey;\n";
    return "";
}

function hasResultActions(apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return true;
    if (apiCall.url === "/Authentication/GetEntityToken")
        return true;
    if (apiCall.url === "/Client/AttributeInstall")
        return true;
    return false;
}

function getResultActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult")
        return tabbing + "if (result != null) {\n"
            + tabbing + "       if(result.data.SessionTicket != null) {\n"
            + tabbing + "           PlayFab._internalSettings.sessionTicket = result.data.SessionTicket;\n"
            + tabbing + "       }\n"
            + tabbing + "       if (result.data.EntityToken != null) {\n"
            + tabbing + "           PlayFab._internalSettings.entityToken = result.data.EntityToken.EntityToken;\n"
            + tabbing + "       }\n"
            + tabbing + "    PlayFab.ClientApi._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n"
            + tabbing + "}";
    if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (result != null && result.data.SessionTicket != null) {\n"
            + tabbing + "    PlayFab._internalSettings.sessionTicket = result.data.SessionTicket;\n"
            + tabbing + "    PlayFab.ClientApi._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n"
            + tabbing + "}";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "if (result != null && result.data.EntityToken != null)\n"
            + tabbing + "    PlayFab._internalSettings.entityToken = result.data.EntityToken;";
    if (apiCall.url === "/Client/AttributeInstall")
        return tabbing + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFab.settings.advertisingIdType += \"_Successful\";\n";
    return "";
}

function getUrl(apiCall) {
    return "PlayFab._internalSettings.GetServerUrl() + \"" + apiCall.url + "\"";
}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFab._internalSettings.entityToken";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFab._internalSettings.sessionTicket";
    return "null, null";
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "/**\n"
            + tabbing + " * @deprecated Please use " + apiObj.deprecation.ReplacedBy + " instead. \n"
            + tabbing + " */\n";
    if (isDeprecated)
        return tabbing + "/**\n"
            + tabbing + " * @deprecated Do not use\n"
            + tabbing + " */\n";
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    for (var i = 0; i < lines.length; i++)
        if (lines[0].contains("*/"))
            return ""; // Can't support end-JS block-comment in our JS comments

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/** " + lines[0] + " */\n";
    } else if (lines.length > 1) {
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else {
        output = "";
    }
    return output;
}

function generateDatatype(api, datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var interfaceTemplate = getCompiledTemplate(path.resolve(templateDir, "Interface.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.ejs"));

    var locals = {
        api: api,
        generateApiSummary: generateApiSummary,
        getBaseTypeSyntax: getBaseTypeSyntax,
        getPropertyTsType: getPropertyTsType,
        datatype: datatype
    };
    if (datatype.isenum)
        return enumTemplate(locals);
    return interfaceTemplate(locals);
}

function getBaseTypeSyntax(datatype) {
    if (datatype.className.toLowerCase().endsWith("request"))
        return " extends PlayFabModule.IPlayFabRequestCommon";
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        return " extends PlayFabModule.IPlayFabResultCommon ";
    return ""; // If both are -1, then neither is greater
}

function getPropertyTsType(property, datatype) {
    var output;

    if (property.actualtype === "String")
        output = "string";
    else if (property.actualtype === "Boolean")
        output = "boolean";
    else if (property.actualtype.contains("int") || property.actualtype === "float" || property.actualtype === "double")
        output = "number";
    else if (property.actualtype === "DateTime")
        output = "string";
    else if (property.isclass)
        output = property.actualtype;
    else if (property.isenum)
        output = "string";
    else if (property.actualtype === "object")
        output = "any";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;

    if (property.collection === "array")
        output += "[]";
    else if (property.collection === "map" && output === "string")
        output = "{ [key: string]: " + output + " | null }"; // Null is frequently a valid dict-value, and we can't distinguish when it's not at this time
    else if (property.collection === "map")
        output = "{ [key: string]: " + output + " }";
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;

    var isOptional = property.optional;
    // TitleId is required at the API level, but optional at the SDK level, because we automagically provide it from settings
    var isLoginRequest = ((datatype.name.contains("Login") && datatype.name.contains("Request")) || datatype.name === "RegisterPlayFabUserRequest");
    if (isLoginRequest && property.name === "TitleId")
        isOptional = true;

    return (isOptional ? "?" : "") + ": " + output;
}
