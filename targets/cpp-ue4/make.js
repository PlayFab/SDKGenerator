var path = require("path");
var blueprint = require("./make-bp.js");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var subFolders = ["PlayFabSDK", "ExampleProject"]; // Two copies, one for example project, and one as the raw plugin
    for (var i = 0; i < subFolders.length; i++) {
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var pluginOutputDir = path.resolve(eachApiOutputDir, "Plugins");
        var outputCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFab");
        var blueprintCodeDir = path.resolve(pluginOutputDir, "PlayFabProxy/Source/PlayFabProxy");

        console.log("Generating UE4 C++ combined SDK to " + eachApiOutputDir);

        // copy the base plugins files, resource, uplugin, etc
        copyTree(path.resolve(sourceDir, "Plugins"), pluginOutputDir);

        for (var a = 0; a < apis.length; a++) {
            makeApi(apis[a], sourceDir, outputCodeDir, "Core/");
            // generate blueprint boilerplate
            blueprint.MakeBp(apis[a], sourceDir, blueprintCodeDir, "Proxy/");
        }

        generateModels(apis, sourceDir, outputCodeDir, "All", "Core/");
        generateSimpleFiles(apis[0], sourceDir, eachApiOutputDir, outputCodeDir, "Core/");
    }

    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "ExampleProject"));
}

function makeApi(api, sourceDir, apiOutputDir, subdir) {
    var apiLocals = {
        api: api,
        generateApiSummary: generateApiSummary,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getUrlAccessor: getUrlAccessor,
        hasClientOptions: api.name === "Client",
        hasServerOptions: api.name !== "Client",
        hasRequest: hasRequest
    };

    var apiHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabAPI.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "PlayFab" + api.name + "API.h"), apiHeaderTemplate(apiLocals));

    var apiBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabAPI.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "API.cpp"), apiBodyTemplate(apiLocals));
}

function generateSimpleFiles(api, sourceDir, apiOutputDir, outputCodeDir, subDir) {
    var sharedLocals = {
        buildIdentifier: exports.buildIdentifier,
        errorList: api.errorList,
        errors: api.errors,
        friendlyName: "PlayFab Cpp Sdk",
        sdkVersion: exports.sdkVersion
    };

    // Errors Definition
    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabError.h.ejs"));
    writeFile(path.resolve(outputCodeDir, "Public", subDir, "PlayFabError.h"), errorsTemplate(sharedLocals));

    // Settings and constants
    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabSettings.cpp.ejs"));
    writeFile(path.resolve(outputCodeDir, "Private", subDir, "PlayFabSettings.cpp"), settingsTemplate(sharedLocals));

    // uplugin file
    var upluginTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs"));
    writeFile(path.resolve(apiOutputDir, "Plugins/PlayFab/PlayFab.uplugin"), upluginTemplate(sharedLocals));

    var uproxyPluginTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabProxy.uplugin.ejs"));
    writeFile(path.resolve(apiOutputDir, "Plugins/PlayFabProxy/PlayFabProxy.uplugin"), uproxyPluginTemplate(sharedLocals));
}

function generateModels(apis, sourceDir, apiOutputDir, libraryName, subdir) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];

        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        for (var i in api.datatypes)
            addTypeAndDependencies(api.datatypes[i], api.datatypes, orderedTypes, addedSet);

        var modelLocals = {
            api: api,
            datatypes: orderedTypes,
            getPropertyCopyValue: getPropertyCopyValue,
            getPropertyDef: getPropertyDef,
            getPropertyDefaultValue: getPropertyDefaultValue,
            getPropertyDescription: getPropertyDescription,
            getPropertyDeserializer: getPropertyDeserializer,
            getPropertySerializer: getPropertySerializer,
            getPropertySafeName: getPropertySafeName,
            libraryName: libraryName
        };

        var modelHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabDataModels.h.ejs"));
        writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/PlayFab" + api.name + "DataModels.h"), modelHeaderTemplate(modelLocals));

        var modelBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/core/PlayFabDataModels.cpp.ejs"));
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "DataModels.cpp"), modelBodyTemplate(modelLocals));
    }
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    if (!extraLines)
        extraLines = [];
    if (apiElement.hasOwnProperty("requestDetails"))
        extraLines.push(apiElement.requestDetails);

    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/** " + lines[0] + " */\n";
    } else if (lines.length > 0) {
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else {
        output = "";
    }
    return output;
}

function hasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function getPropertyDef(property, datatype) {
    var safePropName = getPropertySafeName(property);

    if (property.collection === "array")
        return "TArray<" + getPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return "TMap<FString, " + getPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else
        return getPropertyCppType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
function getPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function getPropertyCppType(property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;

    if (property.actualtype === "String")
        return "FString";
    else if (property.actualtype === "Boolean")
        return isOptional ? "Boxed<bool>" : "bool";
    else if (property.actualtype === "int16")
        return isOptional ? "Boxed<int16>" : "int16";
    else if (property.actualtype === "uint16")
        return isOptional ? "Boxed<uint16>" : "uint16";
    else if (property.actualtype === "int32")
        return isOptional ? "Boxed<int32>" : "int32";
    else if (property.actualtype === "uint32")
        return isOptional ? "Boxed<uint32>" : "uint32";
    else if (property.actualtype === "int64")
        return isOptional ? "Boxed<int64>" : "int64";
    else if (property.actualtype === "uint64")
        return isOptional ? "Boxed<uint64>" : "uint64";
    else if (property.actualtype === "float")
        return isOptional ? "Boxed<float>" : "float";
    else if (property.actualtype === "double")
        return isOptional ? "Boxed<double>" : "double";
    else if (property.actualtype === "DateTime")
        return isOptional ? "Boxed<FDateTime>" : "FDateTime";
    else if (property.isclass)
        return isOptional ? "TSharedPtr<F" + property.actualtype + ">" : "F" + property.actualtype; // sub object
    else if (property.isenum)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype; // enum
    else if (property.actualtype === "object")
        return "FJsonKeeper";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyDefaultValue(property, datatype) {
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

function getPropertyCopyValue(property) {
    var safePropName = getPropertySafeName(property);

    if (property.isclass && property.optional && !property.collection)
        return "src." + safePropName + ".IsValid() ? MakeShareable(new F" + property.actualtype + "(*src." + safePropName + ")) : nullptr";
    return "src." + safePropName;
}

function getPropertySerializer(tabbing, property, datatype) {
    if (property.collection === "array")
        return getArrayPropertySerializer(tabbing, property, datatype);
    else if (property.collection === "map")
        return getMapPropertySerializer(tabbing, property, datatype);

    var writer = null;
    var tester = null;

    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
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
        return tabbing + "if(" + tester + ") { writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer + " }";
    return tabbing + "writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer;
}

function getArrayPropertySerializer(tabbing, property, datatype) {
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCppType(property, datatype, false);

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

    var collectionTabbing = isOptional ? "    " + tabbing : tabbing;
    var collectionWriter = collectionTabbing + "writer->WriteArrayStart(TEXT(\"" + propName + "\"));\n"
        + collectionTabbing + "for (const " + cppType + "& item : " + propName + ")\n"
        + collectionTabbing + "    " + writer + "\n"
        + collectionTabbing + "writer->WriteArrayEnd();\n";

    if (isOptional)
        return tabbing + "if(" + propName + ".Num() != 0)\n"
            + tabbing + "{\n"
            + collectionWriter
            + tabbing + "}\n";
    return collectionWriter;
}

function getMapPropertySerializer(tabbing, property, datatype) {
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCppType(property, datatype, false);

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

    var collectionTabbing = isOptional ? "    " + tabbing : tabbing;
    var collectionWriter = collectionTabbing + "writer->WriteObjectStart(TEXT(\"" + propName + "\"));\n"
        + collectionTabbing + "for (TMap<FString, " + cppType + ">::TConstIterator It(" + propName + "); It; ++It)\n"
        + collectionTabbing + "{\n"
        + collectionTabbing + "    writer->WriteIdentifierPrefix((*It).Key);\n"
        + collectionTabbing + "    " + writer + "\n"
        + collectionTabbing + "}\n"
        + collectionTabbing + "writer->WriteObjectEnd();\n";

    if (isOptional)
        return tabbing + "if(" + propName + ".Num() != 0)\n"
            + tabbing + "{\n"
            + collectionWriter
            + tabbing + "}";
    return tabbing + collectionWriter;
}

// custom deserializer for readDatetime
function getDateTimeDeserializer(tabbing, property) {
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    var propNameValue = propName + "Value";

    var result = tabbing + "const TSharedPtr<FJsonValue> " + propNameValue + " = obj->TryGetField(TEXT(\"" + propName + "\"));\n"
        + tabbing + "if(" + propNameValue + ".IsValid())\n"
        + tabbing + "    " + safePropName + " = readDatetime(" + propNameValue + ");\n"
    return result;
}

function getPropertyDeserializer(tabbing, property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);

    if (property.collection === "array")
        return getArrayPropertyDeserializer(tabbing, property, datatype);
    else if (property.collection === "map")
        return getMapPropertyDeserializer(tabbing, property, datatype);

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
        return getDateTimeDeserializer(tabbing, property);
    }
    else if (property.isclass && property.optional) {
        getter = "MakeShareable(new " + "F" + propType + "(" + propNameFieldValue + "->AsObject()));";
    }
    else if (property.isclass) {
        getter = "F" + propType + "(" + propNameFieldValue + "->AsObject());";
    }
    else if (property.isenum) {
        return tabbing + safePropName + " = read" + propType + "FromValue(obj->TryGetField(TEXT(\"" + propName + "\")));";
    }
    else if (propType === "object") {
        // implement custom call for this
        getter = "FJsonKeeper(" + propNameFieldValue + ");";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }

    var val = tabbing + "const TSharedPtr<FJsonValue> " + propNameFieldValue + " = obj->TryGetField(TEXT(\"" + propName + "\"));\n"
        + tabbing + "if (" + propNameFieldValue + ".IsValid()&& !" + propNameFieldValue + "->IsNull())\n"
        + tabbing + "{\n";

    if (property.isclass || propType === "object")
        val += tabbing + "    " + safePropName + " = " + getter + "\n";
    else
        val += tabbing + "    " + temporary + "\n"
            + tabbing + "    if(" + propNameFieldValue + "->" + getter + ") {" + safePropName + " = TmpValue; }\n";
    val += tabbing + "}";

    return val;
}

// specialization for array of strings
function getArrayStringPropertyDeserializer(tabbing, property, datatype) {
    var isOptional = property.optional;
    var optionalOption = "";

    if (isOptional === false)
        optionalOption = "HasSucceeded &= ";

    if (property.actualtype === "String")
        return tabbing + optionalOption + "obj->TryGetStringArrayField(TEXT(\"" + property.name + "\")," + property.name + ");";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getArrayPropertyDeserializer(tabbing, property, datatype) {
    var getter = null; // represent the getter call function
    var temporary = ""; // represents a potential intermediate state used for some variables

    if (property.actualtype === "String") {
        return getArrayStringPropertyDeserializer(tabbing, property, datatype);
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
        getter = "FJsonKeeper(CurrentItem)";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    var propertyArrayName = property.name + "Array";

    var val = tabbing + "const TArray<TSharedPtr<FJsonValue>>&" + propertyArrayName + " = FPlayFabJsonHelpers::ReadArray(obj, TEXT(\"" + property.name + "\"));\n"
        + tabbing + "for (int32 Idx = 0; Idx < " + propertyArrayName + ".Num(); Idx++)\n"
        + tabbing + "{\n"
        + tabbing + "    TSharedPtr<FJsonValue> CurrentItem = " + propertyArrayName + "[Idx];\n"
        + tabbing + "    " + temporary + "\n"
        + tabbing + "    " + property.name + ".Add(" + getter + ");\n"
        + tabbing + "}\n";

    return val;
}

function getMapPropertyDeserializer(tabbing, property, datatype) {
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
        getter = "FJsonKeeper(It.Value())";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    var propertyObjectName = property.name + "Object";

    var val = tabbing + "const TSharedPtr<FJsonObject>* " + propertyObjectName + ";\n"
        + tabbing + "if (obj->TryGetObjectField(TEXT(\"" + property.name + "\"), " + propertyObjectName + "))\n"
        + tabbing + "{\n"
        + tabbing + "    for (TMap<FString, TSharedPtr<FJsonValue>>::TConstIterator It((*" + propertyObjectName + ")->Values); It; ++It)\n"
        + tabbing + "    {\n"
        + tabbing + "        " + temporary + "\n"
        + tabbing + "        " + property.name + ".Add(It.Key(), " + getter + ");\n"
        + tabbing + "    }\n"
        + tabbing + "}";

    return val;
}

function addTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;

    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            if (property.isclass || property.isenum)
                addTypeAndDependencies(datatypes[property.actualtype], datatypes, orderedTypes, addedSet);
        }
    }

    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

function getPropertyDescription(property) {
    var optional = property.optional ? "[optional] " : "";
    return "// " + optional + property.description;
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "TEXT(\"X-SecretKey\"), PlayFabSettings::developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "TEXT(\"X-Authorization\"), mUserSessionTicket";
    return "TEXT(\"\"), TEXT(\"\")";
}

function getRequestActions(tabbing, apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return tabbing + "if (PlayFabSettings::titleId.Len() > 0)\n"
            + tabbing + "    request.TitleId = PlayFabSettings::titleId;";
    return "";
}

function getResultActions(tabbing, apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return tabbing + "if (outResult.SessionTicket.Len() > 0)\n"
            + tabbing + "{\n"
            + tabbing + "    mUserSessionTicket = outResult.SessionTicket;\n"
            + tabbing + "    MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n"
            + tabbing + "}";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return tabbing + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings::advertisingIdType += \"_Successful\";\n";
    return "";
}

function getUrlAccessor(apiCall) {
    return "PlayFabSettings::getURL(TEXT(\"" + apiCall.url + "\"))";
}
