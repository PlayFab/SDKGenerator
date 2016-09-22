var ejs = require("ejs");
var path = require("path");
var blueprint = require("./make-bp.js");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var subFolders = ["PlayFabSDK", "ExampleProject"]; // Two copies, one for example project, and one as the raw plugin
    for (var i = 0; i < subFolders.length; i++) {
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var pluginOutputDir = path.resolve(eachApiOutputDir, "Plugins");
        var outputCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFab");
        var blueprintCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFabProxy");
        
        console.log("Generating UE4 C++ combined SDK to " + eachApiOutputDir);
        
        // copy the base plugins files, resource, uplugin, etc
        copyTree(path.resolve(sourceDir, "Plugins"), pluginOutputDir);
        
        for (var a = 0; a < apis.length; a++) {
            MakeApi(apis[a], sourceDir, outputCodeDir, "Core/");
            // generate blueprint boilerplate
            blueprint.MakeBp(apis[a], sourceDir, blueprintCodeDir, "Proxy/");
        }
        
        GenerateModels(apis, sourceDir, outputCodeDir, "All", "Core/");
        GenerateSimpleFiles(apis[0], sourceDir, eachApiOutputDir, outputCodeDir, "Core/");
    }

    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "ExampleProject/Source/ExampleProject"));
}

function MakeApi(api, sourceDir, apiOutputDir, subdir) {
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabAPI.h.ejs")));
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabAPI.cpp.ejs")));
    
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.hasClientOptions = api.name === "Client";
    apiLocals.hasServerOptions = api.name !== "Client";
    apiLocals.HasRequest = HasRequest;
    apiLocals.GetApiCallSummary = GetApiCallSummary;
    
    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "PlayFab" + api.name + "API.h"), generatedHeader);
    
    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "API.cpp"), generatedBody);
}

function GenerateSimpleFiles(api, sourceDir, apiOutputDir, outputCodeDir, subDir) {
    var sharedLocals = {}
    sharedLocals.friendlyName = "PlayFab Cpp Sdk";
    sharedLocals.sdkVersion = exports.sdkVersion;
    sharedLocals.buildIdentifier = exports.buildIdentifier;
    sharedLocals.errorList = api.errorList;
    sharedLocals.errors = api.errors;

    // Errors Definition
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabError.h.ejs")));
    var generatedErrors = errorsTemplate(sharedLocals);
    writeFile(path.resolve(outputCodeDir, "Public", subDir, "PlayFabError.h"), generatedErrors);
    
    // Settings and constants
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabSettings.cpp.ejs")));
    var generatedSettings = settingsTemplate(sharedLocals);
    writeFile(path.resolve(outputCodeDir, "Private", subDir, "PlayFabSettings.cpp"), generatedSettings);
    
    // uplugin file
    var upluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var generatedUplugin = upluginTemplate(sharedLocals);
    writeFile(path.resolve(apiOutputDir, "Plugins/PlayFab/PlayFab.uplugin"), generatedUplugin);
}

function GenerateModels(apis, sourceDir, apiOutputDir, libraryName, subdir) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];
        
        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        
        for (var i in api.datatypes) {
            var datatype = api.datatypes[i];
            AddTypeAndDependencies(datatype, api.datatypes, orderedTypes, addedSet);
        }
        
        var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabDataModels.h.ejs")));
        var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabDataModels.cpp.ejs")));
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.GetPropertyDef = GetPropertyDef;
        modelLocals.GetPropertySerializer = GetPropertySerializer;
        modelLocals.GetPropertyDeserializer = GetPropertyDeserializer;
        modelLocals.GetPropertyDefaultValue = GetPropertyDefaultValue;
        modelLocals.GetPropertyCopyValue = GetPropertyCopyValue;
        modelLocals.GetPropertySafeName = GetPropertySafeName;
        modelLocals.GetPropertyDescription = GetPropertyDescription;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/PlayFab" + api.name + "DataModels.h"), generatedHeader);
        
        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "DataModels.cpp"), generatedBody);
    }
}

function GetApiCallSummary(apiCall) {
    var summary = apiCall.summary;
    if (apiCall.hasOwnProperty("requestDetails"))
        summary += "\n         * " + apiCall.requestDetails;
    return summary;
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function GetPropertyDef(property, datatype) {
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return "TArray<" + GetPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return "TMap<FString, " + GetPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else
        return GetPropertyCppType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetPropertyCppType(property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype === "String")
        return "FString";
    else if (property.actualtype === "Boolean")
        return isOptional ? "OptionalBool" : "bool";
    else if (property.actualtype === "int16")
        return isOptional ? "OptionalInt16" : "int16";
    else if (property.actualtype === "uint16")
        return isOptional ? "OptionalUint16" : "uint16";
    else if (property.actualtype === "int32")
        return isOptional ? "OptionalInt32" : "int32";
    else if (property.actualtype === "uint32")
        return isOptional ? "OptionalUint32" : "uint32";
    else if (property.actualtype === "int64")
        return isOptional ? "OptionalInt64" : "int64";
    else if (property.actualtype === "uint64")
        return isOptional ? "OptionalUInt64" : "uint64";
    else if (property.actualtype === "float")
        return isOptional ? "OptionalFloat" : "float";
    else if (property.actualtype === "double")
        return isOptional ? "OptionalDouble" : "double";
    else if (property.actualtype === "DateTime")
        return isOptional ? "OptionalTime" : "FDateTime";
    else if (property.isclass)
        return isOptional ? "TSharedPtr<F" + property.actualtype + ">" : "F" + property.actualtype; // sub object
    else if (property.isenum)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype; // enum
    else if (property.actualtype === "object")
        return "FMultitypeVar";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyDefaultValue(property, datatype) {
    var isOptional = property.optional;
    if (property.collection)
        return "";
    
    if (property.actualtype === "String")
        return "";
    else if (property.actualtype === "Boolean")
        return isOptional ? "" : "false";
    else if (property.actualtype === "int16")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint16")
        return isOptional ? "" : "0";
    else if (property.actualtype === "int32")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint32")
        return isOptional ? "" : "0";
    else if (property.actualtype === "int64")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint64")
        return isOptional ? "" : "0";
    else if (property.actualtype === "float")
        return isOptional ? "" : "0";
    else if (property.actualtype === "double")
        return isOptional ? "" : "0";
    else if (property.actualtype === "DateTime")
        return isOptional ? "" : "0";
    else if (property.isclass)
        return isOptional ? "nullptr" : ""; // sub object
    else if (property.isenum)
        return ""; // isOptional ? "" : ""; // enum
    else if (property.actualtype === "object")
        return "";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyCopyValue(property) {
    var safePropName = GetPropertySafeName(property);
    
    if (property.isclass && property.optional && !property.collection) {
        return "src." + safePropName + ".IsValid() ? MakeShareable(new F" + property.actualtype + "(*src." + safePropName + ")) : nullptr";
    }
    return "src." + safePropName;
}

function GetPropertySerializer(property, datatype) {
    if (property.collection === "array")
        return GetArrayPropertySerializer(property, datatype);
    else if (property.collection === "map")
        return GetMapPropertySerializer(property, datatype);
    
    var writer = null;
    var tester = null;
    
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    var isOptional = property.optional;
    
    if (propType === "String") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".IsEmpty() == false";
    }
    else if (propType === "Boolean") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int16") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint16") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int32") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint32") {
        writer = "writer->WriteValue(static_cast<int64>(" + safePropName + "));";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int64") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint64") {
        writer = "writer->WriteValue(static_cast<int64>(" + safePropName + "));";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "float") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "double") {
        writer = "writer->WriteValue(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "DateTime") {
        writer = "writeDatetime(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (property.isclass) {
        if (isOptional)
            writer = safePropName + "->writeJSON(writer);";
        else
            writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + ".IsValid()";
    }
    else if (property.isenum) {
        writer = "write" + propType + "EnumJSON(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "object") {
        writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + ".notNull()";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }
    
    if (isOptional)
        return "if(" + tester + ") { writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer + " }";
    return "writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer;
}

function GetArrayPropertySerializer(property, datatype) {
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);
    
    var writer = "writer->WriteValue(item);";
    if (property.actualtype === "uint64")
        writer = "writer->WriteValue(static_cast<int64>(item));";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime(item, writer);";
    else if (property.isclass)
        writer = "item.writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON(item, writer);";
    else if (property.actualtype === "object")
        writer = "item.writeJSON(writer);";
    
    var collectionWriter = "    writer->WriteArrayStart(TEXT(\"" + propName + "\"));\n    ";
    collectionWriter += "\n        for (const " + cppType + "& item : " + propName + ")";
    collectionWriter += "\n        {";
    collectionWriter += "\n            " + writer;
    collectionWriter += "\n        }";
    collectionWriter += "\n        writer->WriteArrayEnd();\n    ";
    
    if (isOptional)
        return "if(" + propName + ".Num() != 0) \n    {\n    " + collectionWriter + " }";
    return "\n    " + collectionWriter;
}

function GetMapPropertySerializer(property, datatype) {
    
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);
    
    var writer = "writer->WriteValue((*It).Value);";
    if (property.actualtype === "uint32")
        writer = "writer->WriteValue(static_cast<int64>((*It).Value));";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime((*It).Value, writer);";
    else if (property.isclass)
        writer = "(*It).Value.writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON((*It).Value, writer);";
    else if (property.actualtype === "object")
        writer = "(*It).Value.writeJSON(writer);";
    
    var collectionWriter = "    writer->WriteObjectStart(TEXT(\"" + propName + "\"));\n";
    collectionWriter += "        for (TMap<FString, " + cppType + ">::TConstIterator It(" + propName + "); It; ++It)\n";
    collectionWriter += "        {\n";
    collectionWriter += "            writer->WriteIdentifierPrefix((*It).Key);\n";
    collectionWriter += "            " + writer + "\n";
    collectionWriter += "        }\n";
    collectionWriter += "        writer->WriteObjectEnd();\n";
    
    if (isOptional)
        return "if(" + propName + ".Num() != 0) \n    {\n    " + collectionWriter + "     }";
    return "\n    " + collectionWriter;
}

// custom deserializer for readDatetime
function GetDateTimeDeserializer(property) {
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    var propNameValue = propName + "Value";
    
    var result = "";
    result += "const TSharedPtr<FJsonValue> " + propNameValue + " = obj->TryGetField(TEXT(\"" + propName + "\"));\n";
    result += "    if(" + propNameValue + ".IsValid())\n";
    result += "    {\n";
    result += "        " + safePropName + " = readDatetime(" + propNameValue + ");\n";
    result += "    }";
    return result;
}

function GetPropertyDeserializer(property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return GetArrayPropertyDeserializer(property, datatype);
    else if (property.collection === "map")
        return GetMapPropertyDeserializer(property, datatype);
    
    var getter = null;
    var temporary = "";
    var propNameFieldValue = propName + "Value";
    
    if (propType === "String") {
        temporary = "FString TmpValue;";
        getter = "TryGetString(TmpValue)";
    }
    else if (propType === "Boolean") {
        temporary = "bool TmpValue;";
        getter = "TryGetBool(TmpValue)";
    }
    else if (propType === "int16") {
        temporary = "int32 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "uint16") {
        temporary = "uint32 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "int32") {
        temporary = "int32 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "uint32") {
        temporary = "uint32 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "int64") {
        temporary = "int64 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "uint64") {
        temporary = "int64 TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "float") {
        temporary = "double TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "double") {
        temporary = "double TmpValue;";
        getter = "TryGetNumber(TmpValue)";
    }
    else if (propType === "DateTime") {
        return GetDateTimeDeserializer(property);
    }
    else if (property.isclass && property.optional) {
        getter = "MakeShareable(new " + "F" + propType + "(" + propNameFieldValue + "->AsObject()));";
    }
    else if (property.isclass) {
        getter = "F" + propType + "(" + propNameFieldValue + "->AsObject());";
    }
    else if (property.isenum) {
        return safePropName + " = read" + propType + "FromValue(obj->TryGetField(TEXT(\"" + propName + "\")));";
    }
    else if (propType === "object") {
        // implement custom call for this
        getter = "FMultitypeVar(" + propNameFieldValue + "->AsObject());";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }
    
    var val = "";
    val += "const TSharedPtr<FJsonValue> " + propNameFieldValue + " = obj->TryGetField(TEXT(\"" + propName + "\"));\n";
    val += "    if (" + propNameFieldValue + ".IsValid()&& !" + propNameFieldValue + "->IsNull())\n";
    val += "    {\n";
    
    if (property.isclass || propType === "object") {
        val += "        " + safePropName + " = " + getter + "\n";
    }
    else {
        val += "        " + temporary + "\n";
        val += "        if(" + propNameFieldValue + "->" + getter + ") {" + safePropName + " = TmpValue; }\n";
    }
    val += "    }";
    
    return val;
}

// specialization for array of strings
function GetArrayStringPropertyDeserializer(property, datatype) {
    var isOptional = property.optional;
    var optionalOption = "";
    
    if (isOptional === false)
        optionalOption = "HasSucceeded &= ";
    
    if (property.actualtype === "String")
        return optionalOption + "obj->TryGetStringArrayField(TEXT(\"" + property.name + "\")," + property.name + ");";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetArrayPropertyDeserializer(property, datatype) {
    var getter = null; // represent the getter call function
    var temporary = ""; // represent the
    
    if (property.actualtype === "String") {
        return GetArrayStringPropertyDeserializer(property, datatype);
    }
    else if (property.actualtype === "Boolean") {
        getter = "CurrentItem->AsBool()";
    }
    else if (property.actualtype === "int16") {
        temporary = "int32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint16") {
        temporary = "uint32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "int32") {
        temporary = "int32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint32") {
        temporary = "uint32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "int64") {
        temporary = "int64 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint64") {
        temporary = "int64 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "float") {
        temporary = "double TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "(float)TmpValue";
    }
    else if (property.actualtype === "double") {
        temporary = "double TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualtype === "DateTime") {
        getter = "readDatetime(CurrentItem)";
    }
    else if (property.isclass) {
        getter = "F" + property.actualtype + "(CurrentItem->AsObject())";
    }
    else if (property.isenum) {
        getter = "read" + property.actualtype + "FromValue(CurrentItem)";
    }
    else if (property.actualtype === "object") {
        getter = "FMultitypeVar(CurrentItem)";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    var propertyArrayName = property.name + "Array";
    
    var val = "{\n";
    val += "        const TArray< TSharedPtr<FJsonValue> >&" + propertyArrayName + " = FPlayFabJsonHelpers::ReadArray(obj, TEXT(\"" + property.name + "\"));\n";
    val += "        for (int32 Idx = 0; Idx < " + propertyArrayName + ".Num(); Idx++)\n";
    val += "        {\n";
    val += "            TSharedPtr<FJsonValue> CurrentItem = " + propertyArrayName + "[Idx];\n";
    val += "            " + temporary + "\n";
    val += "            " + property.name + ".Add(" + getter + ");\n";
    val += "        }\n";
    val += "    }\n";
    
    return val;
}

function GetMapPropertyDeserializer(property, datatype) {
    var getter = null;
    var temporary = "";
    
    if (property.actualtype === "String") {
        getter = "It.Value()->AsString()";
    }
    else if (property.actualtype === "Boolean") {
        getter = "It.Value()->AsBool()";
    }
    else if (property.actualtype === "int16") {
        temporary = "int32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint16") {
        temporary = "uint32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "int32") {
        temporary = "int32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint32") {
        temporary = "uint32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "int64") {
        temporary = "int64 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "uint64") {
        temporary = "int64 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "float") {
        temporary = "double TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "(float)TmpValue";
    }
    else if (property.actualtype === "double") {
        temporary = "double TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualtype === "DateTime") {
        getter = "readDatetime(It.Value())";
    }
    else if (property.isclass) {
        getter = "F" + property.actualtype + "(It.Value()->AsObject())";
    }
    else if (property.isenum) {
        getter = "read" + property.actualtype + "FromValue(It.Value())";
    }
    else if (property.actualtype === "object") {
        getter = "FMultitypeVar(It.Value()->AsObject())";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    var propertyObjectName = property.name + "Object";
    
    var val = "const TSharedPtr<FJsonObject>* " + propertyObjectName + ";\n";
    val += "    if (obj->TryGetObjectField(TEXT(\"" + property.name + "\"), " + propertyObjectName + "))\n";
    val += "    {\n";
    val += "        for (TMap<FString, TSharedPtr<FJsonValue>>::TConstIterator It((*" + propertyObjectName + ")->Values); It; ++It)\n";
    val += "        {\n";
    val += "            " + temporary + "\n";
    val += "            " + property.name + ".Add(It.Key(), " + getter + ");\n";
    val += "        }\n";
    val += "    }";
    
    return val;
}

function AddTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;
    
    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            if (property.isclass || property.isenum) {
                var dependentType = datatypes[property.actualtype];
                AddTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet);
            }
        }
    }
    
    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

function GetPropertyDescription(property) {
    var optional = property.optional ? "[optional] ": "";
    return "// " + optional + property.description;
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "TEXT(\"X-SecretKey\"), PlayFabSettings::developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "TEXT(\"X-Authorization\"), mUserSessionTicket";
    return "TEXT(\"\"), TEXT(\"\")";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "if (PlayFabSettings::titleId.Len() > 0)\n        request.TitleId = PlayFabSettings::titleId;";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "        if (outResult.SessionTicket.Len() > 0)\n" 
            + "        {\n" 
            + "            mUserSessionTicket = outResult.SessionTicket;\n" 
            + "            MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n" 
            + "        }";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "        // Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "        PlayFabSettings::advertisingIdType += \"_Successful\";";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "        if (outResult.Url.Len() > 0) PlayFabSettings::logicServerURL = outResult.Url;";
    return "";
}

function GetUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings::getLogicURL(TEXT(\"" + apiCall.url + "\"))";
    return "PlayFabSettings::getURL(TEXT(\"" + apiCall.url + "\"))";
}
