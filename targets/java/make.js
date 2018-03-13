var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["", "../AndroidStudioExample/app/"];

    for (var i = 0; i < srcOutputLoc.length; i++) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        var isAndroid = srcOutputDir.indexOf("AndroidStudioExample") >= 0;

        var locals = { hasClientOptions: true, hasServerOptions: false };
        console.log("Generating Java client SDK to " + srcOutputDir);
        templatizeTree(locals, path.resolve(sourceDir, "srcCode"), srcOutputDir);
        makeDatatypes(apis, sourceDir, srcOutputDir);
        for (var j = 0; j < apis.length; j++)
            makeApi(apis[j], sourceDir, apiOutputDir, false);
        generateSimpleFiles(apis, "Client", sourceDir, srcOutputDir, isAndroid);
    }
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java server SDK to " + apiOutputDir);

    var locals = { hasClientOptions: false, hasServerOptions: true };
    templatizeTree(locals, path.resolve(sourceDir, "srcCode"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    generateSimpleFiles(apis, "Server", sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java combined SDK to " + apiOutputDir);

    var locals = { hasClientOptions: true, hasServerOptions: true };
    templatizeTree(locals, path.resolve(sourceDir, "srcCode"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    generateSimpleFiles(apis, "Combo", sourceDir, apiOutputDir);
}

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
    console.log("Generating Java " + api.name + " library to " + apiOutputDir);

    var locals = {
        api: api,
        isAndroid: isAndroid,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getUrlAccessor: getUrlAccessor,
        generateApiSummary: generateApiSummary,
        hasClientOptions: api.name === "Client"
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.java.ejs"));
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + api.name + "API.java"), apiTemplate(locals));
}

function generateSimpleFiles(apis, apiName, sourceDir, apiOutputDir, isAndroid) {

    var locals = {
        apiName: apiName,
        apiNameLc: apiName.toLowerCase(),
        buildIdentifier: exports.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: false,
        hasServerOptions: false,
        isAndroid: isAndroid,
        sdkVersion: exports.sdkVersion,
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            locals.hasClientOptions = true;
        else if (apis[i].name !== "Entity")
            locals.hasServerOptions = true;
    }

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.java.ejs"));
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFabErrors.java"), errorsTemplate(locals));

    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.java.ejs"));
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFabSettings.java"), settingsTemplate(locals));

    if (!isAndroid) {
        var pomTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/pom.xml.ejs"));
        writeFile(path.resolve(apiOutputDir, "pom.xml"), pomTemplate(locals));
    }
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

function getResultActions(tabbing, apiCall, api) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "PlayFabSettings.EntityToken = result.EntityToken != null ? result.EntityToken : PlayFabSettings.EntityToken;\n";
    else if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket != null ? result.SessionTicket : PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "MultiStepClientLogin(resultData.data.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    return "";
}

function getUrlAccessor() {
    return "PlayFabSettings.GetURL()";
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
