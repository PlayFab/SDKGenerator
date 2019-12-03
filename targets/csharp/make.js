var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyOrTemplatizeFile) === "undefined") copyOrTemplatizeFile = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

const copyright = "\"Copyright Microsoft © 2019\"";

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    const rootOutputDir = apiOutputDir;
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);

    const locals = {
        apis: apis,
        buildIdentifier: sdkGlobals.buildIdentifier,
        copyright: copyright,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        extraDefines: ";NETFX_CORE;SIMPLE_JSON_TYPEINFO;ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API",
        getVerticalNameDefault: getVerticalNameDefault,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        libname: "All",
        sdkDate: sdkGlobals.sdkVersion.split(".")[2],
        sdkVersion: sdkGlobals.sdkVersion,
        sdkYear: sdkGlobals.sdkVersion.split(".")[2].substr(0, 2)
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), rootOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);

    for (var i = 0; i < apis.length; i++) {
        var apiAuths = getAuthMechanisms([apis[i]]);
        locals.hasClientOptions = apiAuths.includes("SessionTicket");
        locals.hasEntityTokenOptions = apiAuths.includes("EntityToken");
        locals.hasServerOptions = apiAuths.includes("SecretKey");
        makeApi(apis[i], sourceDir, apiOutputDir);
    }

    const xamarinOutputDir = path.join(rootOutputDir, "XamarinTestRunner");
    templatizeTree(locals, path.resolve(sourceDir, "XamarinTestRunner"), xamarinOutputDir);
    templatizeTree(locals, path.join(apiOutputDir, "source"), path.join(xamarinOutputDir, "XamarinTestRunner", "PlayFabSDK"));
};

function getBaseTypeSyntax(datatype) {
    var parents = [];

    //begin classes - only 1 possible
    if (datatype.className.toLowerCase().endsWith("request"))
        parents.push("PlayFabRequestCommon");
    else if (datatype.className.toLowerCase() === "loginresult" || datatype.className === "RegisterPlayFabUserResult")
        parents.push("PlayFabLoginResultCommon");
    else if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        parents.push("PlayFabResultCommon");
    //end classes - only 1

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
            getMakeFieldOrProperty: getMakeFieldOrProperty,
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
    var apiAuths = getAuthMechanisms([api]);
    var locals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getCustomApiLogic: getCustomApiLogic,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        generateApiSummary: generateApiSummary,
        hasClientOptions: apiAuths.includes("SessionTicket"),
        hasEntityTokenOptions: apiAuths.includes("EntityToken"),
        hasServerOptions: apiAuths.includes("SecretKey"),
    };

    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), apiTemplate(locals));

    console.log("Generating C# " + api.name + "Instance library to " + apiOutputDir);
    var instTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_InstanceAPI.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "InstanceAPI.cs"), instTemplate(locals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
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

function getMakeFieldOrProperty(datatype) {
    if (datatype.name === "ExecuteFunctionRequest"
        || datatype.name === "EntityKey"
        || datatype.name === "EntityRequest")
        return "{ get; set; }";
    return ";";
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

function getAuthParams(apiCall, isInstance = false) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", requestContext.EntityToken";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", requestSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", requestContext.ClientSessionTicket";
    return "null, null";
}

function getRequestActions(tabbing, apiCall, isInstance) {
    if ((apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return tabbing + "if (request != null) request.TitleId = request?.TitleId ?? requestSettings.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new PlayFabException(PlayFabExceptionCode.TitleNotSet, \"TitleId must be set in your local or global settings to call this method\");\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if (requestContext.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, \"Must call Client Login or GetEntityToken before calling this method\");\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "if (requestContext.ClientSessionTicket == null) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (requestSettings.DeveloperSecretKey == null) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"DeveloperSecretKey must be set in your local or global settings to call this method\");\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "string authKey = null, authValue = null;\n"
            + "#if !DISABLE_PLAYFABCLIENT_API\n"
            + tabbing + "if (requestContext.ClientSessionTicket != null) { authKey = \"X-Authorization\"; authValue = requestContext.ClientSessionTicket; }\n"
            + "#endif\n\n"
            + "#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API\n"
            + tabbing + "if (requestSettings.DeveloperSecretKey != null) { authKey = \"X-SecretKey\"; authValue = requestSettings.DeveloperSecretKey; }\n"
            + "#endif\n\n"
            + "#if !DISABLE_PLAYFABENTITY_API\n"
            + tabbing + "if (requestContext.EntityToken != null) { authKey = \"X-EntityToken\"; authValue = requestContext.EntityToken; }\n"
            + "#endif\n";
    return "";
}

function getCustomApiLogic(tabbing, apiCall) {
    if (apiCall.name === "ExecuteFunction") {
        return "\n" + tabbing + "string localApiServerString = PlayFabSettings.LocalApiServer;\n"
            + tabbing + "if (!string.IsNullOrEmpty(localApiServerString))\n"
            + tabbing + "{\n"
            + tabbing + "    var baseUri = new System.Uri(localApiServerString);\n"
            + tabbing + "    var fullUri = new System.Uri(baseUri, \"" + apiCall.url + "\".TrimStart('/'));\n\n"
            + tabbing + "    // Duplicate code necessary to avoid changing all SDK methods to new convention\n"
            + tabbing + "    var debugHttpResult = await PlayFabHttp.DoPostWithFullUri(fullUri.AbsoluteUri, request, " + getAuthParams(apiCall) + ", extraHeaders);\n"
            + tabbing + "    if (debugHttpResult is PlayFabError debugError)\n"
            + tabbing + "    {\n"
            + tabbing + "        PlayFabSettings.GlobalErrorHandler?.Invoke(debugError);\n"
            + tabbing + "        return new PlayFabResult<ExecuteFunctionResult> { Error = debugError, CustomData = customData };\n"
            + tabbing + "    }\n\n"
            + tabbing + "    var debugResultRawJson = (string) debugHttpResult;\n"
            + tabbing + "    var debugResultData = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject<PlayFabJsonSuccess<ExecuteFunctionResult>>(debugResultRawJson);\n"
            + tabbing + "    var debugResult = debugResultData.data;\n"
            + tabbing + "    return new PlayFabResult<ExecuteFunctionResult> { Result = debugResult, CustomData = customData };\n"
            + tabbing + "}\n";
    }
    return "";
}

function getResultActions(tabbing, apiCall, api, isInstance) {
    if ((apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult") && isInstance)
        return tabbing + "result.AuthenticationContext = new PlayFabAuthenticationContext(result.SessionTicket, result.EntityToken.EntityToken, result.PlayFabId, result.EntityToken.Entity.Id, result.EntityToken.Entity.Type);\n"
            + tabbing + "authenticationContext.CopyFrom(result.AuthenticationContext);\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    if ((apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult") && !isInstance)
        return tabbing + "result.AuthenticationContext = new PlayFabAuthenticationContext(result.SessionTicket, result.EntityToken.EntityToken, result.PlayFabId, result.EntityToken.Entity.Id, result.EntityToken.Entity.Type);\n"
            + tabbing + "PlayFabSettings.staticPlayer.CopyFrom(result.AuthenticationContext);\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.result === "AttributeInstallResult" && isInstance)
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "if (apiSettings != null) apiSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (apiCall.result === "AttributeInstallResult" && !isInstance)
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings.staticSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (apiCall.result === "GetEntityTokenResponse" && isInstance)
        return tabbing + "var updateContext = authenticationContext;\n"
            + tabbing + "updateContext.EntityToken = result.EntityToken;\n"
            + tabbing + "updateContext.EntityId = result.Entity.Id;\n"
            + tabbing + "updateContext.EntityType = result.Entity.Type;\n";
    else if (apiCall.result === "GetEntityTokenResponse")
        return tabbing + "var updateContext = PlayFabSettings.staticPlayer;\n"
            + tabbing + "updateContext.EntityToken = result.EntityToken;\n"
            + tabbing + "updateContext.EntityId = result.Entity.Id;\n"
            + tabbing + "updateContext.EntityType = result.Entity.Type;\n";
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

function getApiDefineFlag(api) {
    if (api.name === "Client")
        return "!DISABLE_PLAYFABCLIENT_API"; // Client is enabled by default, so the flag is inverted
    if (api.name === "Matchmaker")
        return "ENABLE_PLAYFABSERVER_API"; // Matchmaker is bound to server, which is just a legacy design decision at this point
    if (api.name === "Admin" || api.name === "Server")
        return "ENABLE_PLAYFAB" + api.name.toUpperCase() + "_API";

    // For now, everything else is considered ENTITY
    return "!DISABLE_PLAYFABENTITY_API";
}
