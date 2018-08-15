var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyFile) === "undefined") copyFile = function () { };
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabClientSDK");
    console.log("Generating C-sharp client SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "Client", "");
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabServerSDK");
    console.log("Generating C-sharp server SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "Server", ";DISABLE_PLAYFABCLIENT_API");
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "UnittestRunner")); // Copy the actual unittest project in the CombinedAPI
    copyFile(path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "All", "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API");
    generateNugetTemplate(sourceDir, apiOutputDir);
}

function getBaseTypeSyntax(datatype) {
    var parents = [];

    if (datatype.className.toLowerCase().endsWith("request"))
        parents.push("PlayFabRequestCommon");
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        parents.push("PlayFabResultCommon");
    if (datatype.sortKey)
        parents.push("IComparable<" + datatype.name + ">");

    var output = "";
    if (parents.length > 0) {
        output = " : ";
        for (var i = 0; i < parents.length; i++) {
            if (i !== 0)
                output += ", ";
            output += parents[i];
        }
    }
    return output;
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var modelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Model.cs.ejs"));
    var modelsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Models.cs.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Enum.cs.ejs"));

    var makeDatatype = function (datatype, api) {
        var modelLocals = {
            api: api,
            datatype: datatype,
            generateApiSummary: generateApiSummary,
            getModelPropertyDef: getModelPropertyDef,
            getPropertyAttribs: getPropertyAttribs,
            getBaseTypeSyntax: getBaseTypeSyntax,
            getDeprecationAttribute: getDeprecationAttribute
        };

        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };

    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {
            api: apis[a],
            makeDatatype: makeDatatype
        };

        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + apis[a].name + "Models.cs"), modelsTemplate(modelsLocal));
    }
}

function makeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);

    var apiLocals = {
        api: api,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        generateApiSummary: generateApiSummary,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket")
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), apiTemplate(apiLocals));
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        buildIdentifier: exports.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        sdkVersion: exports.sdkVersion
    };

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), errorsTemplate(locals));

    var utilTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabUtil.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabUtil.cs"), utilTemplate(locals));

    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabSettings.cs"), settingsTemplate(locals));
}

function generateProject(apis, sourceDir, apiOutputDir, libname, extraDefines) {
    var projLocals = {
        apis: apis,
        libname: libname,
        extraDefines: ";NETFX_CORE;SIMPLE_JSON_TYPEINFO" + extraDefines
    };

    var vcProjTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), vcProjTemplate(projLocals));
}

function generateNugetTemplate(sourceDir, apiOutputDir) {
    var projLocals = {
        sdkVersion: exports.sdkVersion,
        sdkDate: exports.sdkVersion.split(".")[2],
        sdkYear: exports.sdkVersion.split(".")[2].substr(0, 2)
    };

    var vcProjTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSDK.nuspec.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.nuspec"), vcProjTemplate(projLocals));
}

function getModelPropertyDef(property, datatype) {
    var basicType;
    if (property.collection) {
        basicType = getPropertyCsType(property, datatype, false);

        if (property.collection === "array")
            return "List<" + basicType + "> " + property.name;
        else if (property.collection === "map")
            return "Dictionary<string," + basicType + "> " + property.name;
        else
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    }
    else {
        basicType = getPropertyCsType(property, datatype, true);
        return basicType + " " + property.name;
    }
}

function getPropertyAttribs(property, datatype, api) {
    var attribs = "";

    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "[Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n        ";
        else
            attribs += "[Unordered]\n        ";
    }

    return attribs;
}

function getPropertyCsType(property, datatype, needOptional) {
    var optional = (needOptional && property.optional) ? "?" : "";

    if (property.actualtype === "String")
        return "string";
    else if (property.actualtype === "Boolean")
        return "bool" + optional;
    else if (property.actualtype === "int16")
        return "short" + optional;
    else if (property.actualtype === "uint16")
        return "ushort" + optional;
    else if (property.actualtype === "int32")
        return "int" + optional;
    else if (property.actualtype === "uint32")
        return "uint" + optional;
    else if (property.actualtype === "int64")
        return "long" + optional;
    else if (property.actualtype === "uint64")
        return "ulong" + optional;
    else if (property.actualtype === "float")
        return "float" + optional;
    else if (property.actualtype === "double")
        return "double" + optional;
    else if (property.actualtype === "DateTime")
        return "DateTime" + optional;
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "object";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFabSettings.EntityToken";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings.ClientSessionTicket";
    return "null, null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request.TitleId = PlayFabSettings.TitleId ?? request.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new PlayFabException(PlayFabExceptionCode.TitleNotSet, \"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if (PlayFabSettings.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, \"Must call GetEntityToken before calling this method\");\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "if (PlayFabSettings.ClientSessionTicket == null) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (PlayFabSettings.DeveloperSecretKey == null) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "string authKey = null, authValue = null;\n"
            + tabbing + "if (PlayFabSettings.ClientSessionTicket != null) { authKey = \"X-Authorization\"; authValue = PlayFabSettings.ClientSessionTicket; }\n"
            + tabbing + "if (PlayFabSettings.DeveloperSecretKey != null) { authKey = \"X-SecretKey\"; authValue = PlayFabSettings.DeveloperSecretKey; }\n"
            + tabbing + "if (PlayFabSettings.EntityToken != null) { authKey = \"X-EntityToken\"; authValue = PlayFabSettings.EntityToken; }\n";
    return "";
}

function getResultActions(tabbing, apiCall, api) {
    if (apiCall.result === "LoginResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket ?? PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "PlayFabSettings.EntityToken = result.EntityToken?.EntityToken ?? PlayFabSettings.EntityToken;\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket ?? PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.result === "AttributeInstallResult")
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (apiCall.result === "GetEntityTokenResponse")
        return tabbing + "PlayFabSettings.EntityToken = result.EntityToken;\n";
    return "";
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true" : "false";

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "[Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n";
    else if (isDeprecated)
        return tabbing + "[Obsolete(\"No longer available\", " + isError + ")]\n";
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else if (lines.length > 0) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else {
        output = "";
    }
    return output;
}
