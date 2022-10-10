var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () {};
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () {};
if (typeof (templatizeTree) === "undefined") templatizeTree = function () {};

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Node.js combined SDK to " + apiOutputDir);

    // Load the templates
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "api.js.ejs"));
    var apiTypingsTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_Api.d.ts.ejs"));

    var locals = {
        apis: apis,
        buildIdentifier: sdkGlobals.buildIdentifier,
        description: "Playfab SDK for node.js applications",
        generateDatatype: generateDatatype,
        generateApiSummary: generateApiSummary,
        getAuthParams: getAuthParams,
        getDeprecationAttribute: getDeprecationAttribute,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        // Node is combo-only, which always has all options for all common files
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        projectName: "playfab-sdk",
        sdkVersion: sdkGlobals.sdkVersion,
        sourceDir: sourceDir,
        getVerticalNameDefault: getVerticalNameDefault
    };

    var eachOutputDir = path.resolve(apiOutputDir, "PlayFabSdk");
    templatizeTree(locals, path.resolve(sourceDir, "source"), eachOutputDir);

    // Write the API files
    for (var i = 0; i < apis.length; i++) {
        locals.api = apis[i];
        locals.hasClientOptions = getAuthMechanisms([apis[i]]).includes("SessionTicket");

        writeFile(path.resolve(eachOutputDir, "Scripts/PlayFab/PlayFab" + apis[i].name + ".js"), apiTemplate(locals));
        writeFile(path.resolve(eachOutputDir, "Scripts/typings/PlayFab/PlayFab" + apis[i].name + ".d.ts"), apiTypingsTemplate(locals));
    }
};

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
}

function getAuthParams(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "authKey,\n"
            + tabbing + "authValue";
    else if (apiCall.auth === "EntityToken")
        return tabbing + "\"X-EntityToken\",\n"
            + tabbing + "PlayFab._internalSettings.entityToken";
    else if (apiCall.auth === "SecretKey")
        return tabbing + "\"X-SecretKey\",\n"
            + tabbing + "PlayFab.settings.developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return tabbing + "\"X-Authorization\",\n"
            + tabbing + "PlayFab._internalSettings.sessionTicket";
    return tabbing + "null,\n"
            + tabbing + "null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "var authKey = \"\";\n"
            + tabbing + "var authValue = \"\";\n"
            + tabbing + "if (PlayFab._internalSettings.sessionTicket) {\n"
            + tabbing + "    authKey = \"X-Authorization\";\n"
            + tabbing + "    authValue = PlayFab._internalSettings.sessionTicket;\n"
            + tabbing + "} else if (PlayFab.settings.developerSecretKey) {\n"
            + tabbing + "    authKey = \"X-SecretKey\";\n"
            + tabbing + "    authValue = PlayFab.settings.developerSecretKey;\n"
            + tabbing + "} else if (PlayFab._internalSettings.entityToken) {\n"
            + tabbing + "    authKey = \"X-EntityToken\";\n"
            + tabbing + "    authValue = PlayFab._internalSettings.entityToken;\n"
            + tabbing + "}\n";
    else if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request.TitleId = request.titleId != null ? request.TitleId : PlayFab.settings.titleId;\n"
            + tabbing + "if (request.TitleId == null) {\n"
            + tabbing + "    throw \"Must be have PlayFab.settings.titleId set to call this method\";\n"
            + tabbing + "}\n";
    else if (apiCall.auth === "SessionTicket")
        return tabbing + "if (PlayFab._internalSettings.sessionTicket == null) {\n"
            + tabbing + "    throw \"Must be logged in to call this method\";\n"
            + tabbing + "}\n";
    else if (apiCall.auth === "SecretKey")
        return tabbing + "if (PlayFab.settings.developerSecretKey == null) {\n"
            + tabbing + "    throw \"Must have PlayFab.settings.DeveloperSecretKey set to call this method\";\n"
            + tabbing + "}\n";
    return "";
}

function getResultActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "if (result != null && result.data != null) {\n"
            + tabbing + "    PlayFab._internalSettings.entityToken = result.data.hasOwnProperty(\"EntityToken\") ? result.data.EntityToken : PlayFab._internalSettings.entityToken;\n"
            + tabbing + "}\n";
    if (apiCall.url === "/GameServerIdentity/AuthenticateGameServerWithCustomId")
        return tabbing + "if (result != null && result.data != null ) {\n"
            + tabbing + "    PlayFab._internalSettings.entityToken = (result.data.hasOwnProperty(\"EntityToken\") && result.data.EntityToken.hasOwnProperty(\"EntityToken\")) ? result.data.EntityToken.EntityToken : PlayFab._internalSettings.entityToken;\n"
            + tabbing + "}\n";
    else if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (result != null && result.data != null) {\n"
            + tabbing + "    PlayFab._internalSettings.sessionTicket = result.data.hasOwnProperty(\"SessionTicket\") ? result.data.SessionTicket : PlayFab._internalSettings.sessionTicket;\n"
            + tabbing + "    PlayFab._internalSettings.entityToken = result.data.hasOwnProperty(\"EntityToken\") ? result.data.EntityToken.EntityToken : PlayFab._internalSettings.entityToken;\n"
            + tabbing + "}\n";
    return "";
}

function getDeprecationAttribute(tabbing, apiObj) {
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

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "// " + lines[0] + "\n";
    } else if (lines.length > 1) {
        output = tabbing + "// " + lines.join("\n" + tabbing + "// ") + "\n";
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
        generateApiSummary: generateApiSummary,
        getBaseTypeSyntax: getBaseTypeSyntax,
        getPropertyTsType: getPropertyTsType,
        api: api,
        datatype: datatype
    };
    if (datatype.isenum)
        return enumTemplate(locals);
    return interfaceTemplate(locals);
}

function getBaseTypeSyntax(datatype) {
    if (datatype.isRequest)
        return " extends PlayFabModule.IPlayFabRequestCommon";
    if (datatype.isResult)
        return " extends PlayFabModule.IPlayFabResultCommon";
    return ""; // If both are -1, then neither is greater
}

function getPropertyTsType(property, datatype) {
    var output;

    if (property.actualtype === "String")
        output = "string";
    else if (property.actualtype === "Boolean")
        output = "boolean";
    else if (property.isclass)
        output = property.actualtype;
    else if (property.actualtype.contains("int") || property.actualtype === "float" || property.actualtype === "double")
        output = "number";
    else if (property.actualtype === "DateTime")
        output = "string";
    else if (property.isenum)
        output = "string";
    else if (property.actualtype === "object")
        output = "any";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;

    if (property.collection === "array")
        output += "[]";
    else if (property.collection === "map" && output === "string")
        output = "{ [key: string]: string | null }";
    else if (property.collection === "map")
        output = "{ [key: string]: " + output + " }";
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;

    var isOptional = property.optional;
    var isLoginRequest = ((datatype.name.contains("Login") && datatype.isRequest) || datatype.name === "RegisterPlayFabUserRequest");
    if (isLoginRequest && property.name === "TitleId")
        isOptional = true;

    return (isOptional ? "?" : "") + ": " + output;
}
