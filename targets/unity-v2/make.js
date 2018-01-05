var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (getApiJson) === "undefined") getApiJson = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };

exports.putInRoot = true;

// Automatically called by generate.js
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    exports.MakeUnityV2Sdk(apis, sourceDir, path.resolve(apiOutputDir, "Source/PlayFabSDK"));
    makeTestingFiles(apis, sourceDir, apiOutputDir);
}

// This function is additionally called from the csharp-unity-gameserver target
exports.MakeUnityV2Sdk = function (apis, sourceDir, apiOutputDir) {
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeSharedEventFiles(apis, sourceDir, apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        makeApiEventFiles(apis[i], sourceDir, apiOutputDir);
        makeApi(apis[i], sourceDir, apiOutputDir);
    }
}

function makeTestingFiles(apis, sourceDir, apiOutputDir) {
    var testingOutputDir = path.resolve(apiOutputDir, "Testing");
    copyTree(path.resolve(sourceDir, "Testing"), testingOutputDir);
}

function makeApiEventFiles(api, sourceDir, apiOutputDir) {
    var apiLocals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "PlayFabEvents.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFabEvents.cs"), apiTemplate(apiLocals));
}

function makeSharedEventFiles(apis, sourceDir, apiOutputDir) {
    var playStreamEventModels = getApiJson("PlayStreamEventModels.json");
    var eventLocals = {
        apis: apis,
        sourceDir: sourceDir,
        psParentTypes: playStreamEventModels.ParentTypes,
        psChildTypes: playStreamEventModels.ChildTypes,
        generateApiSummary: generateApiSummary,
        getApiDefineFlag: getApiDefineFlag,
        getDeprecationAttribute: getDeprecationAttribute,
        getPropertyDef: getModelPropertyDef,
        makeDatatype: makePlayStreamDatatype
    };

    // Events for api-callbacks
    var eventTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "Events.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayFabEvents.cs"), eventTemplate(eventLocals));

    // PlayStream event models
    var psTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates", "PlayStreamEventDataModels.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayStream/PlayStreamEventDataModels.cs"), psTemplate(eventLocals));
}

function makePlayStreamDatatype(datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.cs.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.cs.ejs"));

    var modelLocals = {
        datatype: datatype,
        generateApiSummary: generateApiSummary,
        getDeprecationAttribute: getDeprecationAttribute,
        getPropertyDef: getModelPropertyDef,
        getPropertyJsonReader: getPropertyJsonReader,
        getBaseTypeSyntax: function () { return ""; } // No base types in PlayStream
    };

    return datatype.isenum ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
};

function getBaseTypeSyntax(datatype) {
    if (datatype.className.toLowerCase().endsWith("request"))
        return " : PlayFabRequestCommon";
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        return " : PlayFabResultCommon";
    return ""; // If both are -1, then neither is greater
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
    var apiLocals = {
        api: api,
        getApiDefineFlag: getApiDefineFlag,
        getAuthParams: getAuthParams,
        generateApiSummary: generateApiSummary,
        getDeprecationAttribute: getDeprecationAttribute,
        getRequestActions: getRequestActions,
        getCustomApiFunction: getCustomApiFunction,
        hasClientOptions: api.name === "Client"
    };

    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFab" + api.name + "API.cs"), apiTemplate(apiLocals));
}

// Some apis have entirely custom built functions to augment apis in ways that aren't generate-able
function getCustomApiFunction(tabbing, apiCall) {
    if (apiCall.name === "ExecuteCloudScript") {
        return "\n\n" + tabbing + "public static void " + apiCall.name + "<TOut>(" + apiCall.request + " request, Action<" + apiCall.result + "> resultCallback, Action<PlayFabError> errorCallback, object customData = null, Dictionary<string, string> extraHeaders = null)\n"
            + tabbing + "{\n"
            + tabbing + "Action<" + apiCall.result + "> wrappedResultCallback = (wrappedResult) =>\n"
            + tabbing + "{\n"
            + tabbing + "    var wrappedJson = JsonWrapper.SerializeObject(wrappedResult.FunctionResult);\n"
            + tabbing + "    try {\n"
            + tabbing + "        wrappedResult.FunctionResult = JsonWrapper.DeserializeObject<TOut>(wrappedJson);\n"
            + tabbing + "    }\n"
            + tabbing + "    catch (Exception)\n"
            + tabbing + "    {\n"
            + tabbing + "        wrappedResult.FunctionResult = wrappedJson;\n"
            + tabbing + "        wrappedResult.Logs.Add(new LogStatement{ Level = \"Warning\", Data = wrappedJson, Message = \"Sdk Message: Could not deserialize result as: \" + typeof (TOut).Name });\n"
            + tabbing + "    }\n"
            + tabbing + "    resultCallback(wrappedResult);\n"
            + tabbing + "};\n"
            + tabbing + "" + apiCall.name + "(request, wrappedResultCallback, errorCallback, customData, extraHeaders);\n"
            + tabbing + "}";
    }
    return ""; // Most apis don't have a custom alternate
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorLocals = {
        errorList: apis[0].errorList,
        errors: apis[0].errors
    };

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "Shared/Internal/PlayFabErrors.cs"), errorsTemplate(errorLocals));

    var settingsLocals = {
        sdkVersion: exports.sdkVersion,
        buildIdentifier: exports.buildIdentifier,
        hasServerOptions: false,
        hasClientOptions: false
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }

    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayFabSettings.cs"), settingsTemplate(settingsLocals));
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

function getRequestActions(tabbing, apiCall, api) {
    if (api.name === "Entity" && (apiCall.name === "GetEntityToken"))
        return tabbing + "AuthType authType = AuthType.None;\n" +
            "#if !DISABLE_PLAYFABCLIENT_API\n" +
            tabbing + "if (authType == AuthType.None && PlayFabClientAPI.IsClientLoggedIn())\n" +
            tabbing + "    authType = AuthType.LoginSession;\n" +
            "#endif\n" +
            tabbing + "if (authType == AuthType.None && !string.IsNullOrEmpty(PlayFabSettings.DeveloperSecretKey))\n" +
            tabbing + "    authType = AuthType.DevSecretKey;\n";

    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return tabbing + "request.TitleId = request.TitleId ?? PlayFabSettings.TitleId;\n"
            + tabbing + "if (request.TitleId == null) throw new TitleIdNotSetException();\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return tabbing + "if (!IsClientLoggedIn()) throw new ClientNotLoggedInException();\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if (PlayFabSettings.DeveloperSecretKey == null) throw new DeveloperSecretKeyNotSetException();\n";
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

function getApiDefineFlag(api) {
    if (api.name === "Client")
        return "!DISABLE_PLAYFABCLIENT_API"; // Client is enabled by default, so the flag is inverted
    if (api.name === "Matchmaker")
        return "ENABLE_PLAYFABSERVER_API"; // Matchmaker is bound to server, which is just a legacy design decision at this point
    return "ENABLE_PLAYFAB" + api.name.toUpperCase() + "_API";
}
