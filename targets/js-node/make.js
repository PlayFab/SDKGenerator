var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Node.js combined SDK to " + apiOutputDir);

    // Load the templates
    var templateDir = path.resolve(sourceDir, "templates");
    var indexTemplate = getCompiledTemplate(path.resolve(templateDir, "index.js.ejs"));
    var tsconfigTemplate = getCompiledTemplate(path.resolve(templateDir, "tsconfig.json.ejs"));
    var coreTemplate = getCompiledTemplate(path.resolve(templateDir, "playfab.js.ejs"));
    var npmTemplate = getCompiledTemplate(path.resolve(templateDir, "package.json.ejs"));
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "api.js.ejs"));
    var apiTypingsTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_Api.d.ts.ejs"));

    var destSubFolders = ["PlayFabSdk", "_testTypeScript"]; // Write both the published sdk folder and the typescript testing folder
    for (var fIdx = 0; fIdx < destSubFolders.length; fIdx++) {
        var eachOutputDir = path.resolve(apiOutputDir, destSubFolders[fIdx]);

        copyTree(path.resolve(sourceDir, "source"), eachOutputDir);

        // Write the core functionality file
        var coreLocals = {
            apis: apis,
            buildIdentifier: exports.buildIdentifier,
            sdkVersion: exports.sdkVersion,
            hasClientOptions: false,
            hasServerOptions: false
        };
        for (var a = 0; a < apis.length; a++) {
            if (apis[a].name === "Client")
                coreLocals.hasClientOptions = true;
            else if (apis[a].name !== "Entity")
                coreLocals.hasServerOptions = true;
        }
        writeFile(path.resolve(eachOutputDir, "index.js"), indexTemplate(coreLocals));
        writeFile(path.resolve(eachOutputDir, "tsconfig.json"), tsconfigTemplate(coreLocals));
        writeFile(path.resolve(eachOutputDir, "Scripts/PlayFab/PlayFab.js"), coreTemplate(coreLocals));

        // Write the package file
        var isTesting = (destSubFolders[fIdx] === "_testTypeScript");
        var locals = {
            isTesting: isTesting,
            sdkVersion: exports.sdkVersion,
            projectName: isTesting ? "playfab-testing" : "playfab-sdk",
            description: isTesting ? "Playfab SDK automated testing example" : "Playfab SDK for node.js applications",
            sourceDir: sourceDir,

            generateDatatype: generateDatatype,
            generateApiSummary: generateApiSummary,
            getAuthParams: getAuthParams,
            getRequestActions: getRequestActions,
            getResultActions: getResultActions,
            getUrlAccessor: getUrlAccessor,
            getDeprecationAttribute: getDeprecationAttribute
        };

        // Write the API files
        writeFile(path.resolve(eachOutputDir, "package.json"), npmTemplate(locals));
        for (var i = 0; i < apis.length; i++) {
            locals.api = apis[i];
            locals.hasServerOptions = apis[i].name !== "Client" && apis[i].name !== "Entity";
            locals.hasClientOptions = apis[i].name === "Client";

            writeFile(path.resolve(eachOutputDir, "Scripts/PlayFab/PlayFab" + apis[i].name + ".js"), apiTemplate(locals));
            writeFile(path.resolve(eachOutputDir, "Scripts/typings/PlayFab/PlayFab" + apis[i].name + ".d.ts"), apiTypingsTemplate(locals));
        }
    }

    // Copy testing files
    copyTree(path.resolve(sourceDir, "_testTypeScript"), path.resolve(apiOutputDir, "_testTypeScript"));
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFab._internalSettings.sessionTicket";

    return "null, null";
}

function getRequestActions(tabbing, apiCall, api) {
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        output = tabbing + "request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId;\n    if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        output = tabbing + "if (PlayFab._internalSettings.sessionTicket == null) throw \"Must be logged in to call this method\";";
    if (apiCall.auth === "SecretKey")
        output = tabbing + "if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.DeveloperSecretKey set to call this method\";\n";

    return output;
}

function getResultActions(tabbing, apiCall, api) {
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        output = tabbing + "if (result != null && result.data != null) {\n"
            + tabbing + "    PlayFab._internalSettings.sessionTicket = result.data.hasOwnProperty(\"SessionTicket\") ? result.data.SessionTicket : PlayFab._internalSettings.sessionTicket;\n"
            + tabbing + "    exports._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n"
            + tabbing + "}";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        output = tabbing + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFab.settings.advertisingIdType += \"_Successful\";\n";

    return output;
}

function getUrlAccessor() {
    return "PlayFab.GetServerUrl()";
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
    else if (property.actualtype.contains("int") || property.actualtype === "float" || property.actualtype === "double" || property.actualtype === "decimal")
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
    else if (property.collection === "map")
        output = "{ [key: string]: " + output + " }"; // TODO: handle { [key: string]: string | null }
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;

    var isOptional = property.optional;
    var isLoginRequest = ((datatype.name.contains("Login") && datatype.name.contains("Request")) || datatype.name === "RegisterPlayFabUserRequest");
    if (isLoginRequest && property.name === "TitleId")
        isOptional = true;

    return (isOptional ? "?" : "") + ": " + output;
}
