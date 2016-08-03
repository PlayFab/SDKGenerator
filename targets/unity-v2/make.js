var ejs = require("ejs");
var path = require("path");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var testingOutputDir = path.resolve(apiOutputDir, "Testing");
    apiOutputDir = path.resolve(apiOutputDir, "Source/PlayFabSDK");
    console.log("  - Generating C-sharp Unity Events to\n  -> " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "Testing"), testingOutputDir);
    
    MakeSharedEventFiles(apis, sourceDir, apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        MakeApiEventFiles(apis[i], sourceDir, apiOutputDir);
        MakeApi(apis[i], sourceDir, apiOutputDir);
    }
}

function MakeApiEventFiles(api, sourceDir, apiOutputDir) {
    var apiLocals = {};
    apiLocals.api = api;
    
    var apiTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates", "PlayFabEvents.cs.ejs")));
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFabEvents.cs"), generatedApi);
}

function MakeSharedEventFiles(apis, sourceDir, apiOutputDir) {
    var playStreamEventModels = GetApiJson("PlayStreamEventModels.json");
    var eventLocals = {};
    eventLocals.apis = apis;
    eventLocals.sourceDir = sourceDir;
    eventLocals.psParentTypes = playStreamEventModels.ParentTypes;
    eventLocals.psChildTypes = playStreamEventModels.ChildTypes;
    eventLocals.GetModelPropertyDef = GetModelPropertyDef;
    eventLocals.MakeDatatype = MakePlayStreamDatatype;
    
    // Events for api-callbacks
    var eventTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates", "Events.cs.ejs")));
    var generatedEvents = eventTemplate(eventLocals);
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayFabEvents.cs"), generatedEvents);
    
    // PlayStream event models
    var psTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates", "PlayStreamEventDataModels.cs.ejs")));
    var generatedPsEvents = psTemplate(eventLocals);
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayStream/PlayStreamEventDataModels.cs"), generatedPsEvents);
}

function MakePlayStreamDatatype(datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
    
    var modelLocals = {};
    modelLocals.datatype = datatype;
    modelLocals.getPropertyDef = GetModelPropertyDef;
    modelLocals.GetPropertyJsonReader = GetPropertyJsonReader;
    modelLocals.GetBaseTypeSyntax = function (datatype) { return ""; }; // No base types in PlayStream
    if (datatype.isenum) {
        return enumTemplate(modelLocals);
    }
    return modelTemplate(modelLocals);
};

function GetBaseTypeSyntax(datatype) {
    // Some apis have both words in the classname, so we need the word that appears last, IE the greatest index
    var resultIndex = Math.max(datatype.className.toLowerCase().indexOf("result"), datatype.className.toLowerCase().indexOf("response"));
    var requestIndex = datatype.className.toLowerCase().indexOf("request");
    
    if (resultIndex > requestIndex)
        return " : PlayFabResultCommon";
    if (requestIndex > resultIndex)
        return " : PlayFabRequestCommon";
    return ""; // If both are -1, then neither is greater
}

function MakeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cs.ejs")));
    
    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.MakeDatatype = MakeApiDatatype;
        modelsLocal.sourceDir = sourceDir;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, apis[a].name + "/PlayFab" + apis[a].name + "Models.cs"), generatedModels);
    }
}

function MakeApiDatatype(datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
    
    var modelLocals = {};
    modelLocals.datatype = datatype;
    modelLocals.getPropertyDef = GetModelPropertyDef;
    modelLocals.GetPropertyJsonReader = GetPropertyJsonReader;
    modelLocals.GetBaseTypeSyntax = GetBaseTypeSyntax;
    if (datatype.isenum) {
        return enumTemplate(modelLocals);
    }
    return modelTemplate(modelLocals);
};

function MakeApi(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cs.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.hasClientOptions = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, api.name + "/PlayFab" + api.name + "API.cs"), generatedApi);
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "../Plugins/PlayFabShared/PlayFabErrors.cs"), generatedErrors);
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs")));
    var settingsLocals = {};
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "Shared/Public/PlayFabSettings.cs"), generatedSettings);
}

function GetModelPropertyDef(property, datatype) {
    var basicType = GetPropertyCsType(property, datatype, false);
    if (property.collection && property.collection === "array")
        return "List<" + basicType + "> " + property.name;
    else if (property.collection && property.collection === "map")
        return "Dictionary<string," + basicType + "> " + property.name;
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;
    
    basicType = GetPropertyCsType(property, datatype, true);
    return basicType + " " + property.name;
}

function GetPropertyCsType(property, datatype, needOptional) {
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

function GetPropertyJsType(property, datatype, needOptional) {
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

function GetMapDeserializer(property, datatype) {
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

function GetListDeserializer(property) {
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

function GetPropertyJsonReader(property, datatype) {
    var csType = GetPropertyCsType(property, datatype, false);
    var csOptionalType = GetPropertyCsType(property, datatype, true);
    //var jsType = GetPropertyJsType(property, datatype, false);
    var jsOptionalType = GetPropertyJsType(property, datatype, true);
    
    if (property.isclass && property.collection === "map")
        return property.name + " = JsonUtil.GetObjectDictionary<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass && property.collection === "array")
        return property.name + " = JsonUtil.GetObjectList<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.isclass)
        return property.name + " = JsonUtil.GetObject<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.collection === "map")
        return property.name + " = " + GetMapDeserializer(property, datatype);
    else if (property.collection === "array")
        return property.name + " = " + GetListDeserializer(property);
    else if (property.isenum)
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetEnum<" + csType + ">(json, \"" + property.name + "\");";
    else if (property.actualtype === "DateTime")
        return property.name + " = (" + csOptionalType + ")JsonUtil.GetDateTime(json, \"" + property.name + "\");";
    else if (property.actualtype === "object")
        return property.name + " = JsonUtil.GetObjectRaw(json, \"" + property.name + "\");";
    return property.name + " = (" + csOptionalType + ")JsonUtil.Get<" + jsOptionalType + ">(json, \"" + property.name + "\");";
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "AuthType.DevSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "AuthType.LoginSession";
    return "AuthType.None";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "request.TitleId = request.TitleId ?? PlayFabSettings.TitleId;\n            if (request.TitleId == null) throw new Exception(\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "if (!IsClientLoggedIn()) throw new Exception(\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception(\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}
