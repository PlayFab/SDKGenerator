var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyOrTemplatizeFile) === "undefined") copyOrTemplatizeFile = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

const copyright = "\"Copyright Microsoft © 2019\"";

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabClientSDK");
    console.log("Generating C-sharp client SDK to " + apiOutputDir);

    var locals = {
        buildIdentifier: sdkGlobals.buildIdentifier,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        sdkVersion: sdkGlobals.sdkVersion
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "Client", "");
};

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabServerSDK");
    console.log("Generating C-sharp server SDK to " + apiOutputDir);

    var locals = {
        buildIdentifier: sdkGlobals.buildIdentifier,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        sdkVersion: sdkGlobals.sdkVersion
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);

    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "Server", ";DISABLE_PLAYFABCLIENT_API;ENABLE_PLAYFABSERVER_API");
};

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    const rootOutputDir = apiOutputDir;
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);

    const locals = {
        buildIdentifier: sdkGlobals.buildIdentifier,
        copyright: copyright,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        sdkVersion: sdkGlobals.sdkVersion
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    templatizeTree(locals, path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "UnittestRunner")); // Copy the actual unittest project in the CombinedAPI
    copyOrTemplatizeFile(locals, path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);

    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "All", ";ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API");

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
    var locals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getCustomApiLogic: getCustomApiLogic,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        generateApiSummary: generateApiSummary,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket")
    };

    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), apiTemplate(locals));

    console.log("Generating C# " + api.name + "Instance library to " + apiOutputDir);
    var instTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/APIInstance.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "InstanceAPI.cs"), instTemplate(locals));
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        buildIdentifier: sdkGlobals.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), errorsTemplate(locals));

    var utilTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabUtil.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabUtil.cs"), utilTemplate(locals));

    var settingsInstanceTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApiSettings.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabApiSettings.cs"), settingsInstanceTemplate(locals));

    var authenticationContextTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabAuthenticationContext.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabAuthenticationContext.cs"), authenticationContextTemplate(locals));
}

function generateProject(apis, sourceDir, apiOutputDir, libname, extraDefines) {
    var projLocals = {
        apis: apis,
        libname: libname,
        extraDefines: ";NETFX_CORE;SIMPLE_JSON_TYPEINFO" + extraDefines,
        sdkVersion: sdkGlobals.sdkVersion,
        sdkDate: sdkGlobals.sdkVersion.split(".")[2],
        sdkYear: sdkGlobals.sdkVersion.split(".")[2].substr(0, 2)
    };

    var vcProjTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabSDK.csproj"), vcProjTemplate(projLocals));
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
        return "\"X-EntityToken\", PlayFabSettings.staticPlayer.EntityToken";
    if (apiCall.auth === "SecretKey" && !isInstance)
        return "\"X-SecretKey\", PlayFabSettings.staticSettings.DeveloperSecretKey";
    if (apiCall.auth === "SecretKey" && isInstance)
        return "\"X-SecretKey\", developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", clientSessionTicket";
    return "null, null";
}

function getRequestActions(tabbing, apiCall, isInstance) {
    if ((apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest") && isInstance)
        return tabbing + "if (request != null) request.TitleId = request?.TitleId ?? apiSettings.TitleId ?? PlayFabSettings.staticSettings.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new PlayFabException(PlayFabExceptionCode.TitleNotSet, \"Must be have PlayFabSettings.staticSettings.TitleId set to call this method\");\n";
    if ((apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest") && !isInstance)
        return tabbing + "if (request != null) request.TitleId = request?.TitleId ?? PlayFabSettings.staticSettings.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new PlayFabException(PlayFabExceptionCode.TitleNotSet, \"Must be have PlayFabSettings.staticSettings.TitleId set to call this method\");\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if ((request?.AuthenticationContext?.EntityToken ?? PlayFabSettings.staticPlayer.EntityToken) == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, \"Must call GetEntityToken before calling this method\");\n";
    if (apiCall.auth === "SessionTicket" && isInstance)
        return tabbing + "var context = request?.AuthenticationContext ?? authenticationContext; var clientSessionTicket = context.ClientSessionTicket;\n"
            + tabbing + "if (clientSessionTicket == null) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SessionTicket" && !isInstance)
        return tabbing + "var context = request?.AuthenticationContext ?? PlayFabSettings.staticPlayer; var clientSessionTicket = context.ClientSessionTicket;\n"
            + tabbing + "if (clientSessionTicket == null) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey" && !isInstance)
        return tabbing + "if (PlayFabSettings.staticSettings.DeveloperSecretKey == null) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"Must have PlayFabSettings.staticSettings.DeveloperSecretKey set to call this method\");\n";
    if (apiCall.auth === "SecretKey" && isInstance)
        return tabbing + "var settings = apiSettings ?? PlayFabSettings.staticSettings; var developerSecretKey = settings.DeveloperSecretKey;\n"
            + tabbing + "if (developerSecretKey == null) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"DeveloperSecretKey is not found in Request, Server Instance or PlayFabSettings\");\n";
    if (apiCall.url === "/Authentication/GetEntityToken" && !isInstance)
        return tabbing + "string authKey = null, authValue = null;\n"
            + "#if !DISABLE_PLAYFABCLIENT_API\n"
            + tabbing + "var context = request?.AuthenticationContext ?? PlayFabSettings.staticPlayer; var clientSessionTicket = context.ClientSessionTicket;\n"
            + tabbing + "if (clientSessionTicket != null) { authKey = \"X-Authorization\"; authValue = clientSessionTicket; }\n"
            + "#endif\n\n"
            + "#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API\n"
            + tabbing + "var developerSecretKey = PlayFabSettings.staticSettings.DeveloperSecretKey;\n"
            + tabbing + "if (developerSecretKey != null) { authKey = \"X-SecretKey\"; authValue = developerSecretKey; }\n"
            + "#endif\n\n"
            + "#if !DISABLE_PLAYFABENTITY_API\n"
            + tabbing + "var entityToken = request?.AuthenticationContext?.EntityToken ?? PlayFabSettings.staticPlayer.EntityToken;\n"
            + tabbing + "if (entityToken != null) { authKey = \"X-EntityToken\"; authValue = entityToken; }\n"
            + "#endif\n";
    if (apiCall.url === "/Authentication/GetEntityToken" && isInstance)
        return tabbing + "string authKey = null, authValue = null;\n"
            + "#if !DISABLE_PLAYFABCLIENT_API\n"
            + tabbing + "var clientSessionTicket = request?.AuthenticationContext?.ClientSessionTicket ?? authenticationContext.ClientSessionTicket;\n"
            + tabbing + "if (clientSessionTicket != null) { authKey = \"X-Authorization\"; authValue = clientSessionTicket; }\n"
            + "#endif\n\n"
            + "#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API\n"
            + tabbing + "var settings = apiSettings ?? PlayFabSettings.staticSettings; var developerSecretKey = settings.DeveloperSecretKey;\n"
            + tabbing + "if (developerSecretKey != null) { authKey = \"X-SecretKey\"; authValue = developerSecretKey; }\n"
            + "#endif\n\n"
            + "#if !DISABLE_PLAYFABENTITY_API\n"
            + tabbing + "var entityToken = request?.AuthenticationContext?.EntityToken ?? authenticationContext.EntityToken;\n"
            + tabbing + "if (entityToken != null) { authKey = \"X-EntityToken\"; authValue = entityToken; }\n"
            + "#endif\n";
    return "";
}

function getCustomApiLogic(tabbing, apiCall) {
    if (apiCall.name === "ExecuteFunction")
    {
        return "\n" + tabbing + "string localApiServerString = PlayFabSettings.LocalApiServer;\n"
            + tabbing + "if (!string.IsNullOrEmpty(localApiServerString))\n"
            + tabbing + "{\n"
            + tabbing + "    var baseUri = new Uri(localApiServerString);\n"
            + tabbing + "    var fullUri = new Uri(baseUri, \"" + apiCall.url + "\".TrimStart('/'));\n\n"
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
        return tabbing + "authenticationContext.PlayFabId = result.PlayFabId;\n"
            + tabbing + "authenticationContext.ClientSessionTicket = result.SessionTicket;\n"
            + tabbing + "authenticationContext.EntityToken = result.EntityToken.EntityToken;\n"
            + tabbing + "result.AuthenticationContext = authenticationContext;\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    if ((apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult") && !isInstance)
        return tabbing + "var newContext = new PlayFabAuthenticationContext();\n"
            + tabbing + "PlayFabSettings.staticPlayer.PlayFabId = newContext.PlayFabId = result.PlayFabId;\n"
            + tabbing + "PlayFabSettings.staticPlayer.ClientSessionTicket = newContext.ClientSessionTicket = result.SessionTicket;\n"
            + tabbing + "PlayFabSettings.staticPlayer.EntityToken = newContext.EntityToken = result.EntityToken.EntityToken;\n"
            + tabbing + "result.AuthenticationContext = newContext;\n"
            + tabbing + "await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.result === "AttributeInstallResult" && isInstance)
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "if (apiSettings != null) apiSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (apiCall.result === "AttributeInstallResult" && !isInstance)
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings.staticSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (apiCall.result === "GetEntityTokenResponse")
        return tabbing + "PlayFabSettings.staticPlayer.EntityToken = result.EntityToken;\n";
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
