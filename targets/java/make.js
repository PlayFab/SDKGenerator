var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["PlayFabClientSDK", "AndroidStudioExample/app/"];

    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        apiName: "Client",
        apiNameLc: "Client".toLowerCase(),
        buildIdentifier: sdkGlobals.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        isAndroid: null, // Set Below
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    for (var i = 0; i < srcOutputLoc.length; i++) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        locals.isAndroid = srcOutputDir.indexOf("AndroidStudioExample") >= 0;

        console.log(" + Generating Java Client SDK to " + srcOutputDir);
        makeDatatypes(apis, sourceDir, srcOutputDir);
        for (var a = 0; a < apis.length; a++)
            makeApi(apis[a], sourceDir, srcOutputDir, false);
        templatizeTree(locals, path.resolve(sourceDir, "source_shared"), srcOutputDir);
        if (locals.isAndroid)
            templatizeTree(locals, path.resolve(sourceDir, "source_androidStudio"), srcOutputDir);
        else
            templatizeTree(locals, path.resolve(sourceDir, "source_std"), srcOutputDir);
    }
};

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabServerSDK");
    console.log("Generating Java server SDK to " + apiOutputDir);

    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        apiName: "Server",
        apiNameLc: "Server".toLowerCase(),
        buildIdentifier: sdkGlobals.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        isAndroid: false,
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    console.log(" + Generating Java Server SDK to " + apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    templatizeTree(locals, path.resolve(sourceDir, "source_shared"), apiOutputDir);
    templatizeTree(locals, path.resolve(sourceDir, "source_std"), apiOutputDir);
};

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating Java combined SDK to " + apiOutputDir);

    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        apiName: "Combo",
        apiNameLc: "Combo".toLowerCase(),
        buildIdentifier: sdkGlobals.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        isAndroid: false,
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    console.log(" + Generating Java Combo SDK to " + apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    templatizeTree(locals, path.resolve(sourceDir, "source_shared"), apiOutputDir);
    templatizeTree(locals, path.resolve(sourceDir, "source_std"), apiOutputDir);
};

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.java.ejs"));
    var modelsTemplate = getCompiledTemplate(path.resolve(templateDir, "Models.java.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.java.ejs"));

    var makeDatatype = function (datatype, api) {
        var locals = {
            api: api,
            datatype: datatype,
            getPropertyDef: getModelPropertyDef,
            getPropertyAttribs: getPropertyAttribs,
            generateApiSummary: generateApiSummary
        };
        return datatype.isenum ? enumTemplate(locals) : modelTemplate(locals);
    };

    for (var a = 0; a < apis.length; a++) {
        var locals = {
            api: apis[a],
            makeDatatype: makeDatatype
        };
        writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + apis[a].name + "Models.java"), modelsTemplate(locals));
    }
}

function makeApi(api, sourceDir, apiOutputDir, isAndroid) {
    var outFileName = path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + api.name + "API.java");
    console.log("  - GenApi " + api.name + " to " + outFileName);

    var locals = {
        api: api,
        isAndroid: isAndroid,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getUrlAccessor: getUrlAccessor,
        generateApiSummary: generateApiSummary,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.java.ejs"));
    writeFile(outFileName, apiTemplate(locals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
}

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyJavaType(property, datatype);
    if (property.collection && property.collection === "array")
        return "ArrayList<" + basicType + "> " + property.name;
    else if (property.collection && property.collection === "map")
        return "Map<String," + basicType + "> " + property.name;
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;

    return getPropertyJavaType(property, datatype) + " " + property.name;
}

function getPropertyAttribs(tabbing, property, datatype, api) {
    var attribs = "";

    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += tabbing + "@Unordered(\"" + listDatatype.sortKey + "\")\n";
        else
            attribs += tabbing + "@Unordered\n";
    }

    return attribs;
}

function getPropertyJavaType(property, datatype) {
    var optional = "";

    if (property.actualtype === "String")
        return "String";
    else if (property.actualtype === "Boolean")
        return "Boolean" + optional;
    else if (property.actualtype === "int16")
        return "Short" + optional;
    else if (property.actualtype === "uint16")
        return "Integer" + optional;
    else if (property.actualtype === "int32")
        return "Integer" + optional;
    else if (property.actualtype === "uint32")
        return "Long" + optional;
    else if (property.actualtype === "int64")
        return "Long" + optional;
    else if (property.actualtype === "uint64")
        return "Long" + optional;
    else if (property.actualtype === "float")
        return "Float" + optional;
    else if (property.actualtype === "double")
        return "Double" + optional;
    else if (property.actualtype === "DateTime")
        return "Date" + optional;
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "Object";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFabSettings.EntityToken";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings.ClientSessionTicket";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    return "null, null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "String authKey = null, authValue = null;\n"
            + tabbing + "if (PlayFabSettings.EntityToken != null) { authKey = \"X-EntityToken\"; authValue = PlayFabSettings.EntityToken; }\n"
            + tabbing + "else if (PlayFabSettings.ClientSessionTicket != null) { authKey = \"X-Authorization\"; authValue = PlayFabSettings.ClientSessionTicket; }\n"
            + tabbing + "else if (PlayFabSettings.DeveloperSecretKey != null) { authKey = \"X-SecretKey\"; authValue = PlayFabSettings.DeveloperSecretKey; }\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "if (PlayFabSettings.ClientSessionTicket == null) throw new Exception (\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if (PlayFabSettings.EntityToken == null) throw new Exception (\"Must call GetEntityToken before you can use the Entity API\");\n";
    return "";
}

function getResultActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "PlayFabSettings.EntityToken = result.EntityToken != null ? result.EntityToken : PlayFabSettings.EntityToken;\n";
    if (apiCall.url === "/GameServerIdentity/AuthenticateGameServerWithCustomId")
        return tabbing + "PlayFabSettings.EntityToken = (result.EntityToken != null && result.EntityToken.EntityToken != null) ? result.EntityToken.EntityToken : PlayFabSettings.EntityToken;\n";
    else if (apiCall.result === "LoginResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket != null ? result.SessionTicket : PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "if (result.EntityToken != null) PlayFabSettings.EntityToken = result.EntityToken.EntityToken != null ? result.EntityToken.EntityToken : PlayFabSettings.EntityToken;\n";
    else if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket != null ? result.SessionTicket : PlayFabSettings.ClientSessionTicket;\n";
    return "";
}

function getUrlAccessor(apiCallUrl) {
    return "PlayFabSettings.GetURL(\"" + apiCallUrl + "\")";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines, false, "@deprecated");

    // FILTERING: Java is very picky about the output
    if (lines) {
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
            if (lines[i].contains("*/"))
                lines[i] = null;
        }
    }

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/** " + lines[0] + " */\n";
    } else if (lines.length > 1) {
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else {
        output = "";
    }

    // TODO: The deprecation attribute should be a separate GetDeprecationAttribute call like various other SDKS
    if (apiElement.hasOwnProperty("deprecation"))
        output += tabbing + "@Deprecated\n";

    return output;
}
