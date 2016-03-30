var path = require("path");

exports.putInRoot = true;

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var baseApiOutputDir = path.resolve(apiOutputDir, "Packages/PlayFabContext/");
    console.log("  - Generating C-sharp Unity StrangeIoC Wrapper client to\n  -> " + baseApiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), baseApiOutputDir);
    makeSignals(api, sourceDir, baseApiOutputDir + "/Signals/");
    makeCommands(api, sourceDir, baseApiOutputDir + "/Commands/");
    makeBindingsFactory(api, sourceDir, baseApiOutputDir + "/Factories/");
    makeContext(api, sourceDir, baseApiOutputDir);
    //var testingOutputDir = path.resolve(apiOutputDir, "_ClientTesting");
    //console.log("  - Copying client SDK to\n  -> " + testingOutputDir);
    //copyTree(path.resolve(apiOutputDir, "PlayFabClientSample"), testingOutputDir);
    //copyTree(path.resolve(sourceDir, "testing/DemoScene"), path.resolve(testingOutputDir, "Assets/PlayFabSDK/DemoScene"));
}


function getIsResultHandler(datatype) {
    if (datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1) {
        return true;
    }
    return false;
}

function makeSignals(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");

    //Write Signals
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "strangeioc-playfab-signals.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSignals.cs"), generatedApi);

}

function makeCommands(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");

    //Write Signals
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "strangeioc-playfab-commands.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabCommands.cs"), generatedApi);

}
function makeContext(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");

    //Write Signals
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "strangeioc-playfab-context.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabContext.cs"), generatedApi);

}
function makeBindingsFactory(api, sourceDir, apiOutputDir) {
    console.log("   - Generating C# " + api.name + " library to\n   -> " + apiOutputDir);

    var templateDir = path.resolve(sourceDir, "templates");

    //Write Signals
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "strangeioc-playfab-contextbindings.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabBindingsFactory.cs"), generatedApi);

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
