var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (getApiJson) === "undefined") getApiJson = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

// Automatically called by generate.js
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var defaultUnitySubFolder = "Source/PlayFabSDK";

    exports.MakeUnityV2Sdk(apis, sourceDir, path.resolve(apiOutputDir, sdkGeneratorGlobals.unitySubfolder ? sdkGeneratorGlobals.unitySubfolder : defaultUnitySubFolder));
    makeTestingFiles(apis, sourceDir, apiOutputDir);
}

// This function is additionally called from the csharp-unity-gameserver target
exports.MakeUnityV2Sdk = function (apis, sourceDir, apiOutputDir) {
    var locals = {
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        sdkVersion: sdkGlobals.sdkVersion,
        buildIdentifier: sdkGlobals.buildIdentifier,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        getVerticalNameDefault: getVerticalNameDefault
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    makeSharedEventFiles(apis, sourceDir, apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        makeApi(apis[i], sourceDir, apiOutputDir);
        makeInstanceApi(apis[i], sourceDir, apiOutputDir);
    }
}

function makeTestingFiles(apis, sourceDir, apiOutputDir) {
    var testingOutputDir = path.resolve(apiOutputDir, "Testing");

    var locals = {
    };

    templatizeTree(locals, path.resolve(sourceDir, "Testing"), testingOutputDir);
}

function makeApiEventFiles(api, sourceDir, apiOutputDir) {
    var apiLocals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "PlayFabEvents.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFabEvents.cs"), apiTemplate(apiLocals));
}

function makeSharedEventFiles(apis, sourceDir, apiOutputDir) {
    var eventLocals = {
        apis: apis,
        sourceDir: sourceDir,
        generateApiSummary: generateApiSummary,
        getApiDefineFlag: getApiDefineFlag,
        getDeprecationAttribute: getDeprecationAttribute,
        getPropertyDef: getModelPropertyDef
    };

    // Events for api-callbacks
    var eventTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "Events.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayFabEvents.cs"), eventTemplate(eventLocals));
}

function getBaseTypeSyntax(datatype) {
    if (datatype.isResult && datatype.className === "LoginResult" || datatype.className === "RegisterPlayFabUserResult")
        return " : PlayFabLoginResultCommon";
    if (datatype.isRequest)
        return " : PlayFabRequestCommon";
    if (datatype.isResult)
        return " : PlayFabResultCommon";
    return " : PlayFabBaseModel"; // If both are -1, then neither is greater
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelsTemplate = getCompiledTemplate(path.resolve(templateDir, "Models.cs.ejs"));

    var modelsLocal = {
        getApiDefineFlag: getApiDefineFlag,
        makeDatatype: makeApiDatatype,
        sourceDir: sourceDir
    };

    for (var a = 0; a < apis.length; a++) {
        modelsLocal.api = apis[a];
        writeFile(path.resolve(apiOutputDir, apis[a].name + "/PlayFab" + apis[a].name + "Models.cs"), modelsTemplate(modelsLocal));
    }
}

function makeApiDatatype(datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.cs.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.cs.ejs"));

    var modelLocals = {
        datatype: datatype,
        generateApiSummary: generateApiSummary,
        getDeprecationAttribute: getDeprecationAttribute,
        getPropertyDef: getModelPropertyDef,
        getPropertyJsonReader: getPropertyJsonReader,
        getBaseTypeSyntax: getBaseTypeSyntax
    };

    return datatype.isenum ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
};

function makeApi(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");
    var locals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
        getAuthParams: getAuthParams,
        generateApiSummary: generateApiSummary,
        getDeprecationAttribute: getDeprecationAttribute,
        getRequestActions: getRequestActions,
        getCustomApiLogic: getCustomApiLogic,
        getCustomApiFunction: getCustomApiFunction,
        hasEntityTokenOptions: getAuthMechanisms([api]).includes("EntityToken"),
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
        isPartial: isPartial(api.name)
    };

    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFab" + api.name + "API.cs"), apiTemplate(locals));

    var eventTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "PlayFabEvents.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFabEvents.cs"), eventTemplate(locals));
}

function makeInstanceApi(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + "Instance library to\n   -> " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");
    var apiLocals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
        getAuthParams: getAuthParams,
        generateApiSummary: generateApiSummary,
        getDeprecationAttribute: getDeprecationAttribute,
        getRequestActions: getRequestActions,
        getCustomApiFunction: getCustomApiFunction,
        hasEntityTokenOptions: getAuthMechanisms([api]).includes("EntityToken"),
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
        isPartial: isPartial(api.name)
    };

    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "PlayFab_InstanceAPI.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFab" + api.name + "InstanceAPI.cs"), apiTemplate(apiLocals));
}

function isPartial(api) {
    if (api === "Multiplayer") {
        return "partial ";
    }
    else {
        return "";
    }
}

// Some apis have entirely custom built functions to augment apis in ways that aren't generate-able
function getCustomApiFunction(tabbing, api, apiCall, isApiInstance = false) {
    var varCheckLine = "";
    if (api.name === "Client")
        varCheckLine = tabbing + "    if (!IsClientLoggedIn()) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    else if (api.name === "Server" && !isApiInstance)
        varCheckLine = tabbing + "    if (string.IsNullOrEmpty(PlayFabSettings.staticSettings.DeveloperSecretKey)) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"Must set PlayFabSettings.staticSettings.DeveloperSecretKey to call this method\");\n";
    else if (api.name === "Server" && isApiInstance)
        varCheckLine = tabbing + "    if (!string.IsNullOrEmpty(apiSettings.DeveloperSecretKey)) throw new PlayFabException(PlayFabExceptionCode.DeveloperKeyNotSet, \"Must set DeveloperSecretKey to call this method\");\n";

    var authType = "";
    if (api.name === "Client")
        authType = "AuthType.LoginSession";
    else if (api.name === "Server")
        authType = "AuthType.DevSecretKey";

    if (apiCall.name === "ExecuteCloudScript" && isApiInstance === false) {
        return "\n\n" + tabbing + "public static void " + apiCall.name + "<TOut>(" + apiCall.request + " request, Action<" + apiCall.result + "> resultCallback, Action<PlayFabError> errorCallback, object customData = null, Dictionary<string, string> extraHeaders = null)\n"
            + tabbing + "{\n"
            + varCheckLine
            + tabbing + "    var context = (request == null ? null : request.AuthenticationContext) ?? PlayFabSettings.staticPlayer;\n"
            + tabbing + "    Action<" + apiCall.result + "> wrappedResultCallback = (wrappedResult) =>\n"
            + tabbing + "    {\n"
            + tabbing + "        var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);\n"
            + tabbing + "        var wrappedJson = serializer.SerializeObject(wrappedResult.FunctionResult);\n"
            + tabbing + "        try {\n"
            + tabbing + "            wrappedResult.FunctionResult = serializer.DeserializeObject<TOut>(wrappedJson);\n"
            + tabbing + "        } catch (Exception) {\n"
            + tabbing + "            wrappedResult.FunctionResult = wrappedJson;\n"
            + tabbing + "            wrappedResult.Logs.Add(new LogStatement { Level = \"Warning\", Data = wrappedJson, Message = \"Sdk Message: Could not deserialize result as: \" + typeof(TOut).Name });\n"
            + tabbing + "        }\n"
            + tabbing + "        resultCallback(wrappedResult);\n"
            + tabbing + "    };\n"
            + tabbing + "    PlayFabHttp.MakeApiCall(\"" + apiCall.url + "\", request, " + authType + ", wrappedResultCallback, errorCallback, customData, extraHeaders, context);\n"
            + tabbing + "}";
    }
    else if (apiCall.name === "ExecuteCloudScript" && isApiInstance === true) {
        return "\n\n" + tabbing + "public void " + apiCall.name + "<TOut>(" + apiCall.request + " request, Action<" + apiCall.result + "> resultCallback, Action<PlayFabError> errorCallback, object customData = null, Dictionary<string, string> extraHeaders = null)\n"
            + tabbing + "{\n"
            + varCheckLine
            + tabbing + "    var context = (request == null ? null : request.AuthenticationContext) ?? authenticationContext;\n"
            + tabbing + "    Action<" + apiCall.result + "> wrappedResultCallback = (wrappedResult) =>\n"
            + tabbing + "    {\n"
            + tabbing + "        var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);\n"
            + tabbing + "        var wrappedJson = serializer.SerializeObject(wrappedResult.FunctionResult);\n"
            + tabbing + "        try {\n"
            + tabbing + "            wrappedResult.FunctionResult = serializer.DeserializeObject<TOut>(wrappedJson);\n"
            + tabbing + "        }\n"
            + tabbing + "        catch (Exception)\n"
            + tabbing + "        {\n"
            + tabbing + "            wrappedResult.FunctionResult = wrappedJson;\n"
            + tabbing + "            wrappedResult.Logs.Add(new LogStatement { Level = \"Warning\", Data = wrappedJson, Message = \"Sdk Message: Could not deserialize result as: \" + typeof(TOut).Name });\n"
            + tabbing + "        }\n"
            + tabbing + "        resultCallback(wrappedResult);\n"
            + tabbing + "    };\n"
            + tabbing + "    PlayFabHttp.MakeApiCall(\"" + apiCall.url + "\", request, " + authType + ", wrappedResultCallback, errorCallback, customData, extraHeaders, context, apiSettings, this);\n"
            + tabbing + "}";
    }
    return ""; // Most apis don't have a custom alternate
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
}

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyCsType(property, datatype, false);
    if (property.collection && property.collection === "array")
        return "List<" + basicType + "> " + property.name;
    else if (property.collection && property.collection === "map")
        return "Dictionary<string," + basicType + "> " + property.name;
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;

    basicType = getPropertyCsType(property, datatype, true);
    return basicType + " " + property.name;
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
    else if (property.actualtype === "decimal")
        return "decimal" + optional;
    else if (property.actualtype === "DateTime")
        return "DateTime" + optional;
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "object";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;
}

function getPropertyJsType(property, datatype, needOptional) {
    var optional = (needOptional && property.optional) ? "?" : "";

    if (property.actualtype === "String")
        return "string";
    else if (property.actualtype === "Boolean")
        return "bool" + optional;
    else if (property.actualtype === "int16")
        return "double" + optional;
    else if (property.actualtype === "uint16")
        return "double" + optional;
    else if (property.actualtype === "int32")
        return "double" + optional;
    else if (property.actualtype === "uint32")
        return "double" + optional;
    else if (property.actualtype === "int64")
        return "double" + optional;
    else if (property.actualtype === "uint64")
        return "double" + optional;
    else if (property.actualtype === "float")
        return "double" + optional;
    else if (property.actualtype === "double")
        return "double" + optional;
    else if (property.actualtype === "decimal")
        return "double" + optional;
    else if (property.actualtype === "DateTime")
        return "string";
    else if (property.isclass)
        return "object";
    else if (property.isenum)
        return "string";
    else if (property.actualtype === "object")
        return "object";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;
}

function getMapDeserializer(property, datatype) {
    if (property.actualtype === "String")
        return "JsonUtil.GetDictionary<string>(json, \"" + property.name + "\");";
    else if (property.actualtype === "Boolean")
        return "JsonUtil.GetDictionary<bool>(json, \"" + property.name + "\");";
    else if (property.actualtype === "int16")
        return "JsonUtil.GetDictionaryInt16(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint16")
        return "JsonUtil.GetDictionaryUInt16(json, \"" + property.name + "\");";
    else if (property.actualtype === "int32")
        return "JsonUtil.GetDictionaryInt32(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint32")
        return "JsonUtil.GetDictionaryUInt32(json, \"" + property.name + "\");";
    else if (property.actualtype === "int64")
        return "JsonUtil.GetDictionaryInt64(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint64")
        return "JsonUtil.GetDictionaryUint64(json, \"" + property.name + "\");";
    else if (property.actualtype === "float")
        return "JsonUtil.GetDictionaryFloat(json, \"" + property.name + "\");";
    else if (property.actualtype === "double")
        return "JsonUtil.GetDictionaryDouble(json, \"" + property.name + "\");";
    else if (property.actualtype === "object")
        return "JsonUtil.GetDictionary<object>(json, \"" + property.name + "\");";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;
}

function getListDeserializer(property) {
    if (property.actualtype === "String")
        return "JsonUtil.GetList<string>(json, \"" + property.name + "\");";
    else if (property.actualtype === "Boolean")
        return "JsonUtil.GetList<bool>(json, \"" + property.name + "\");";
    else if (property.actualtype === "int16")
        return "JsonUtil.GetListInt16(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint16")
        return "JsonUtil.GetListUInt16(json, \"" + property.name + "\");";
    else if (property.actualtype === "int32")
        return "JsonUtil.GetListInt32(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint32")
        return "JsonUtil.GetListUInt32(json, \"" + property.name + "\");";
    else if (property.actualtype === "int64")
        return "JsonUtil.GetListInt64(json, \"" + property.name + "\");";
    else if (property.actualtype === "uint64")
        return "JsonUtil.GetListUint64(json, \"" + property.name + "\");";
    else if (property.actualtype === "float")
        return "JsonUtil.GetListFloat(json, \"" + property.name + "\");";
    else if (property.actualtype === "double")
        return "JsonUtil.GetListDouble(json, \"" + property.name + "\");";
    else if (property.actualtype === "object")
        return "JsonUtil.GetList<object>(json, \"" + property.name + "\");";
    else if (property.isenum)
        return "JsonUtil.GetListEnum<" + property.actualtype + ">(json, \"" + property.name + "\");";
    throw "Unknown property type: " + property.actualtype + " for " + property.name;
}

function getPropertyJsonReader(property, datatype) {
    var csType = getPropertyCsType(property, datatype, false);
    var csOptionalType = getPropertyCsType(property, datatype, true);
    //var jsType = getPropertyJsType(property, datatype, false);
    var jsOptionalType = getPropertyJsType(property, datatype, true);

    if (property.isclass && property.collection === "map")
        return property.name + " = JsonUtil.GetObjectDictionary<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass && property.collection === "array")
        return property.name + " = JsonUtil.GetObjectList<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass)
        return property.name + " = JsonUtil.GetObject<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.collection === "map")
        return property.name + " = " + getMapDeserializer(property, datatype);
    else if (property.collection === "array")
        return property.name + " = " + getListDeserializer(property);
    else if (property.isenum)
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetEnum<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.actualtype === "DateTime")
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetDateTime(json, \"" + property.name + "\");";
    else if (property.actualtype === "object")
        return property.name + " = JsonUtil.GetObjectRaw(json, \"" + property.name + "\");";
    return property.name + " = (" + csOptionalType + ")JsonUtil.Get<" + jsOptionalType + ">(json, \"" + property.name + "\");";
}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authType";
    else if (apiCall.auth === "SecretKey")
        return "AuthType.DevSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "AuthType.LoginSession";
    else if (apiCall.auth === "EntityToken")
        return "AuthType.EntityToken";
    return "AuthType.None";
}

function getRequestActions(tabbing, apiCall, isApiInstance = false) {
    if (apiCall.name === "GetEntityToken" && isApiInstance === false)
        return tabbing + "AuthType authType = AuthType.None;\n" +
            "#if !DISABLE_PLAYFABCLIENT_API\n" +
            tabbing + "if (context.ClientSessionTicket != null) { authType = AuthType.LoginSession; }\n" +
            "#endif\n" +
            "#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API\n" +
            tabbing + "if (PlayFabSettings.staticSettings.DeveloperSecretKey != null) { authType = AuthType.DevSecretKey; } // TODO: Need to get the correct settings first\n" +
            "#endif\n" +
            "#if !DISABLE_PLAYFABENTITY_API\n" +
            tabbing + "if (context.EntityToken != null) { authType = AuthType.EntityToken; }\n" +
            "#endif\n";
    if (apiCall.name === "GetEntityToken" && isApiInstance === true)
        return tabbing + "AuthType authType = AuthType.None;\n" +
            "#if !DISABLE_PLAYFABCLIENT_API\n" +
            tabbing + "if (context.ClientSessionTicket != null) { authType = AuthType.LoginSession; }\n" +
            "#endif\n" +
            "#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API\n" +
            tabbing + "if (PlayFabSettings.staticSettings.DeveloperSecretKey != null) { authType = AuthType.DevSecretKey; } // TODO: Need to get the correct settings first\n" +
            "#endif\n" +
            "#if !DISABLE_PLAYFABENTITY_API\n" +
            tabbing + "if (context.EntityToken != null) { authType = AuthType.EntityToken; }\n" +
            "#endif\n";

    if ((apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest") && isApiInstance === false)
        return tabbing + "request.TitleId = request.TitleId ?? PlayFabSettings.TitleId;\n";
    if ((apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest") && isApiInstance === true)
        return tabbing + "request.TitleId = request.TitleId ?? callSettings.TitleId;\n";
    if (apiCall.auth === "SessionTicket" && isApiInstance === true)
        return tabbing + "if (string.IsNullOrEmpty(context.ClientSessionTicket)) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn, \"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SessionTicket" && isApiInstance === false)
        return tabbing + "if (!IsClientLoggedIn()) throw new PlayFabException(PlayFabExceptionCode.NotLoggedIn,\"Must be logged in to call this method\");\n";
    return "";
}

function getCustomApiLogic(tabbing, apiCall) {
    if (apiCall.name === "ExecuteFunction")
        return tabbing + "var localApiServerString = PlayFabSettings.LocalApiServer;\n" +
            tabbing + "if (!string.IsNullOrEmpty(localApiServerString))\n" +
            tabbing + "{\n" +
            tabbing + "    var baseUri = new Uri(localApiServerString);\n" +
            tabbing + "    var fullUri = new Uri(baseUri, \"" + apiCall.url + "\".TrimStart('/'));\n" +
            tabbing + "    PlayFabHttp.MakeApiCallWithFullUri(fullUri.AbsoluteUri, request, AuthType.EntityToken, resultCallback, errorCallback, customData, extraHeaders, context);\n" +
            tabbing + "    return;\n" +
            tabbing + "}\n";
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

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true" : "false";

    if (isDeprecated && apiObj.deprecation.ReplacedBy !== null)
        return tabbing + "[Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n";
    else if (isDeprecated)
        return tabbing + "[Obsolete(\"No longer available\", " + isError + ")]\n";
    return "";
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
