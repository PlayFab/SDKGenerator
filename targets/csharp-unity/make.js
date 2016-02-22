var path = require("path");

exports.putInRoot = true;

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var baseApiOutputDir = path.resolve(apiOutputDir, "PlayFabClientSample/Assets/PlayFabSDK");
    console.log("  - Generating C-sharp Unity client SDK sample proj to\n  -> " + baseApiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), baseApiOutputDir);
    makeDatatypes([api], sourceDir, baseApiOutputDir);
    makeAPI(api, sourceDir, baseApiOutputDir);
    generateSimpleFiles([api], sourceDir, baseApiOutputDir, true);
    copyFile(path.resolve(sourceDir, "testing/PlayFabApiTest_Client.cs"), path.resolve(baseApiOutputDir, "Internal/Testing/PlayFabApiTest_Client.cs"));
    copyFile(path.resolve(sourceDir, "testing/EventTest.cs"), path.resolve(baseApiOutputDir, "Internal/Testing/EventTest.cs"));

    // Add the DemoScene to the clientSDK - TODO: A command line parameter that decides when to add it or not, TODO: GitIgnore the DemoScene folder?
    // copyTree(path.resolve(sourceDir, "testing/DemoScene"), path.resolve(baseApiOutputDir, "DemoScene"));
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "PlayFabServerSample/Assets/PlayFabSDK");
    console.log("  - Generating C-sharp Unity server SDK sample proj to\n  -> " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    generateSimpleFiles(apis, sourceDir, apiOutputDir, false);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "PlayFabCombinedTestingSample/Assets/PlayFabSDK");
    console.log("  - Generating C-sharp Unity combined SDK sample proj to\n  -> " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    generateSimpleFiles(apis, sourceDir, apiOutputDir, false);
    copyFile(path.resolve(sourceDir, "testing/PlayFabApiTest.cs"), path.resolve(apiOutputDir, "Internal/Testing/PlayFabApiTest.cs"));
    copyFile(path.resolve(sourceDir, "testing/EventTest.cs"), path.resolve(apiOutputDir, "Internal/Testing/EventTest.cs"));
}

function getIsResultHandler(datatype) {
    if (datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1) {
        return true;
    }
    return false;
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
    
    var makeDatatype = function (datatype) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyAttribs = getPropertyAttribs;
        modelLocals.getPropertyJsonReader = getPropertyJsonReader;
        modelLocals.isResultHandler = getIsResultHandler;
        var generatedModel = null;
        
        if (datatype.isenum) {
            generatedModel = enumTemplate(modelLocals);
        }
        else {
            generatedModel = modelTemplate(modelLocals);
        }
        
        return generatedModel;
    };
    
    for (var a in apis) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "Public/PlayFab" + apis[a].name + "Models.cs"), generatedModels);
    }
}

function makeAPI(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cs.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.hasResultActions = hasResultActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.hasClientOptions = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Public/PlayFab" + api.name + "API.cs"), generatedApi);
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir, isClient) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    if (isClient)
        writeFile(path.resolve(apiOutputDir, "../Plugins/PlayFabShared/PlayFabErrors.cs"), generatedErrors);
    else
        writeFile(path.resolve(apiOutputDir, "Public/PlayFabErrors.cs"), generatedErrors);
    
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cs.ejs")));
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "Internal/PlayFabVersion.cs"), generatedVersion);
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs")));
    var settingsLocals = {};
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    for (var i in apis) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "Public/PlayFabSettings.cs"), generatedSettings);
}

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyCSType(property, datatype, false);
    if (property.collection && property.collection === "array")
        return "List<" + basicType + "> " + property.name;
    else if (property.collection && property.collection === "map")
        return "Dictionary<string," + basicType + "> " + property.name;
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    
    basicType = getPropertyCSType(property, datatype, true);
    return basicType + " " + property.name;
}

function getPropertyAttribs(property, datatype, api) {
    return "";
}

function getPropertyCSType(property, datatype, needOptional) {
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
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyJSType(property, datatype, needOptional) {
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
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
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
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getListDeserializer(property, api) {
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
    var csType = getPropertyCSType(property, datatype, false);
    var csOptionalType = getPropertyCSType(property, datatype, true);
    var jsType = getPropertyJSType(property, datatype, false);
    var jsOptionalType = getPropertyJSType(property, datatype, true);
    
    if (property.isclass && property.collection === "map")
        return property.name + " = JsonUtil.GetObjectDictionary<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass && property.collection === "array")
        return property.name + " = JsonUtil.GetObjectList<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass)
        return property.name + " = JsonUtil.GetObject<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.collection === "map")
        return property.name + " = " + getMapDeserializer(property, datatype);
    else if (property.collection === "array")
        return property.name + " = " + getListDeserializer(property, datatype);
    else if (property.isenum)
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetEnum<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.actualtype === "DateTime")
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetDateTime(json, \"" + property.name + "\");";
    else if (property.actualtype === "object")
        return property.name + " = JsonUtil.GetObjectRaw(json, \"" + property.name + "\");";
    return property.name + " = (" + csOptionalType + ")JsonUtil.Get<" + jsOptionalType + ">(json, \"" + property.name + "\");";
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", _authKey";
    
    return "null, null";
}

function getRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "request.TitleId = request.TitleId ?? PlayFabSettings.TitleId;\n            if (request.TitleId == null) throw new Exception(\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "if (_authKey == null) throw new Exception(\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception(\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}

function hasResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return true;
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return true;
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return true;
    return false;
}

function getResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "            _authKey = result.SessionTicket ?? _authKey;\n" 
            + "            MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "            // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "            PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "            PlayFabSettings.LogicServerUrl = result.Url;\n";
    return "";
}
