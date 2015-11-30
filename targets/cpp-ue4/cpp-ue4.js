var path = require("path");
var assert = require("assert");

var makeAPI = exports.makeAPI = function (api, apiOutputDir, subdir) {
    var sourceDir = __dirname;

    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabAPI.h.ejs")));
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabAPI.cpp.ejs")));

    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.authKey = api.name === "Client";
    apiLocals.hasRequest = hasRequest;
    apiLocals.getApiCallSummary = getApiCallSummary;

    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Public/"+ subdir + "PlayFab" + api.name + "API.h"), generatedHeader);

    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "API.cpp"), generatedBody);
}

var getApiCallSummary = exports.getApiCallSummary = function (apiCall, api)
{
    var summary = "";

    summary += apiCall.summary;

    if (apiCall.hasOwnProperty("requestDetails")) {
        summary += "\n         * " + apiCall.requestDetails;
    }

    return summary;
}

var hasRequestDetails = function (apiCall, api)
{

}

var hasRequest = exports.hasRequest = function (apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

var getPropertyDef = exports.getPropertyDef = function (property, datatype) {

    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);

    if (property.collection === "array")
        return "TArray<" + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return "TMap<FString, " + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
    else
        return getPropertyCPPType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
var getPropertySafeName = exports.getPropertySafeName = function (property) {
    return (property.actualType === property.name) ? "pf" + property.name : property.name;
}

var getPropertyCPPType = exports.getPropertyCPPType = function (property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;

    if (property.actualType === "String") {
        return "FString";
    }
    else if (property.actualType === "Boolean") {
        return isOptional ? "OptionalBool" : "bool";
    }
    else if (property.actualType === "int16") {
        return isOptional ? "OptionalInt16" : "int16";
    }
    else if (property.actualType === "uint16") {
        return isOptional ? "OptionalUint16" : "uint16";
    }
    else if (property.actualType === "int32") {
        return isOptional ? "OptionalInt32" : "int32";
    }
    else if (property.actualType === "uint32") {
        return isOptional ? "OptionalUint32" : "uint32";
    }
    else if (property.actualType === "int64") {
        return isOptional ? "OptionalInt64" : "int64";
    }
    else if (property.actualType === "uint64") {
        return isOptional ? "OptionalUInt64" : "uint64";
    }
    else if (property.actualType === "float") {
        return isOptional ? "OptionalFloat" : "float";
    }
    else if (property.actualType === "double") {
        return isOptional ? "OptionalDouble" : "double";
    }
    else if (property.actualType === "DateTime") {
        return isOptional ? "OptionalTime" : "FDateTime";
    }
    else if (property.isclass) {
        return isOptional ? "TSharedPtr<F" + property.actualtype + ">" : "F"+property.actualtype; // sub object
    }
    else if (property.isenum) {
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype; // enum
    }
    else if (property.actualType === "object") {
        return "FMultitypeVar";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

var getPropertyDefaultValue = exports.getPropertyDefaultValue = function (property, datatype) {
    var isOptional = property.optional;
    if (property.collection)
        return "";

    if (property.actualType === "String") {
        return "";
    }
    else if (property.actualType === "Boolean") {
        return isOptional ? "" : "false";
    }
    else if (property.actualType === "int16") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "uint16") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "int32") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "uint32") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "int64") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "uint64") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "float") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "double") {
        return isOptional ? "" : "0";
    }
    else if (property.actualType === "DateTime") {
        return isOptional ? "" : "0";
    }
    else if (property.isclass) {
        return isOptional ? "nullptr" : ""; // sub object
    }
    else if (property.isenum) {
        return isOptional ? "" : ""; // enum
    }
    else if (property.actualType === "object") {
        return "";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

var getPropertyCopyValue = exports.getPropertyCopyValue = function (property, datatype) {
    var safePropName = getPropertySafeName(property);

    if (property.isclass && property.optional && !property.collection) {
        return "src." + safePropName + ".IsValid() ? MakeShareable(new F" + property.actualtype + "(*src." + safePropName + ")) : nullptr";
    }
    return "src." + safePropName;
}

var getPropertySerializer = exports.getPropertySerializer = function (property, datatype) {
    if (property.collection === "array")
        return getArrayPropertySerializer(property, datatype);
    else if (property.collection === "map")
        return getMapPropertySerializer(property, datatype);

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

    if (isOptional) {
        return "if(" + tester + ") { writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer + " }";
    }
    else {
        return "writer->WriteIdentifierPrefix(TEXT(\"" + propName + "\")); " + writer;
    }
}

var getArrayPropertySerializer = exports.getArrayPropertySerializer = function (property, datatype) {

    /*
    var writer = null;

    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);

    if (property.actualType === "String") {
        writer = "writer.String(iter->c_str());";
    }
    else if (property.actualType === "Boolean") {
        writer = "writer.Bool(*iter);";
    }
    else if (property.actualType === "int16") {
        writer = "writer.Int(*iter);";
    }
    else if (property.actualType === "uint16") {
        writer = "writer.Uint(*iter);";
    }
    else if (property.actualType === "int32") {
        writer = "writer.Int(*iter);";
    }
    else if (property.actualType === "uint32") {
        writer = "writer.Uint(*iter);";
    }
    else if (property.actualType === "int64") {
        writer = "writer.Int64(*iter);";
    }
    else if (property.actualType === "uint64") {
        writer = "writer.Uint64(*iter);";
    }
    else if (property.actualType === "float") {
        writer = "writer.Double(*iter);";
    }
    else if (property.actualType === "double") {
        writer = "writer.Double(*iter);";
    }
    else if (property.actualType === "DateTime") {
        writer = "writeDatetime(*iter, writer);";
    }
    else if (property.isclass) {
        writer = "iter->writeJSON(writer);";
    }
    else if (property.isenum) {
        writer = "write" + property.actualtype + "EnumJSON(*iter, writer);";
    }
    else if (property.actualType === "object") {
        writer = "iter->writeJSON(writer);";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;
    }


    var collectionWriter = "writer.StartArray();\n    ";
    collectionWriter += "for (std::list<" + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); iter++) {\n        ";
    collectionWriter += writer + "\n    }\n    ";
    collectionWriter += "writer.EndArray();\n    ";

    if (isOptional) {
        return "if(!" + propName + ".empty()) {\n    writer.String(\"" + propName + "\");\n    " + collectionWriter + " }";
    }
    else {
        return "writer.String(\"" + propName + "\");\n    " + collectionWriter;
    }*/

    // new implementation

    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);

    var writer = "writer->WriteValue(item);";


    if (property.actualType === "uint64") {
        writer = "writer->WriteValue(static_cast<int64>(item));";
    } else if (property.actualType === "DateTime") {
        writer = "writeDatetime(item, writer);";
    }
    else if (property.isclass) {
        writer = "item.writeJSON(writer);";
    }
    else if (property.isenum) {
        writer = "write" + property.actualtype + "EnumJSON(item, writer);";
    }
    else if (property.actualType === "object") {
        writer = "item.writeJSON(writer);";
    }
//    else {
//        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;
//    }

    var collectionWriter = "    writer->WriteArrayStart(TEXT(\"" + propName + "\"));\n    ";

    collectionWriter += "\n        for (const " + cppType + "& item : " + propName + ")";
    collectionWriter += "\n        {";
    collectionWriter += "\n            "+ writer;
    collectionWriter += "\n        }";

    collectionWriter += "\n        writer->WriteArrayEnd();\n    ";

    if (isOptional) {
        return "if(" + propName + ".Num() != 0) \n    {\n    " + collectionWriter + " }";
    }
    else {
        return "\n    " + collectionWriter;
    }

}


var getMapPropertySerializer = exports.getMapPropertySerializer = function (property, datatype) {

    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);

    var writer = "writer->WriteValue((*It).Value);";

    if (property.actualType === "uint32") {
        writer = "writer->WriteValue(static_cast<int64>((*It).Value));";
    }
    else if (property.actualType === "DateTime") {
        writer = "writeDatetime((*It).Value, writer);";
    }
    else if (property.isclass) {
        writer = "(*It).Value.writeJSON(writer);";
    }
    else if (property.isenum) {
        writer = "write" + property.actualtype + "EnumJSON((*It).Value, writer);";
    }
    else if (property.actualType === "object") {
        writer = "(*It).Value.writeJSON(writer);";
    }

    var collectionWriter = "    writer->WriteObjectStart(TEXT(\""+ propName+ "\"));\n";
    collectionWriter += "        for (TMap<FString, " + cppType + ">::TConstIterator It(" + propName + "); It; ++It)\n";
    collectionWriter += "        {\n";
    collectionWriter += "            writer->WriteIdentifierPrefix((*It).Key);\n";
    collectionWriter += "            " + writer + "\n";
    collectionWriter += "        }\n";
    collectionWriter += "        writer->WriteObjectEnd();\n";

    if (isOptional) {
        return "if(" + propName + ".Num() != 0) \n    {\n    " + collectionWriter + "     }";
    }
    else {
        return "\n    " + collectionWriter;
    }

}

// custom deserializer for readDatetime
var getDateTimeDeserializer = exports.getDateTimeDeserializer = function (property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    var isOptional = property.optional;

    getter = "readDatetime(" + propName + "_member->value);";

    var result = "";

    var propNameValue = propName + "Value";

    result += "const TSharedPtr<FJsonValue> " + propNameValue + " = obj->TryGetField(TEXT(\""+ propName+ "\"));\n";
    result += "    if(" + propNameValue + ".IsValid())\n";
    result += "    {\n";
    result += "        " + safePropName + " = readDatetime(" + propNameValue + ");\n";
    result += "    }";

    return result;

    //const TSharedPtr<FJsonValue> PurchaseDateValue = obj->TryGetField(TEXT("PurchaseDate"));
    //if (PurchaseDateValue.IsValid()) {
    //    PurchaseDate = readDatetime(PurchaseDateValue);
    //}
}


var getPropertyDeserializer = exports.getPropertyDeserializer = function (property, datatype) {

    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    var isOptional = property.optional;

    if (property.collection === "array")
        return getArrayPropertyDeserializer(property, datatype);
    else if (property.collection === "map")
        return getMapPropertyDeserializer(property, datatype);

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
        return getDateTimeDeserializer(property, datatype);
    }
    else if (property.isclass) {

        if (property.optional)
            getter = "MakeShareable(new " + "F" + propType + "(" + propNameFieldValue + "->AsObject()));";
        else
            getter = "F" + propType + "(" + propNameFieldValue + "->AsObject());";

    }
    else if (property.isenum) {
        return safePropName + " = read" + propType + "FromValue(obj->TryGetField(TEXT(\""+ propName+"\")));";
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
        val += "        " + safePropName + " = " + getter +"\n";
    }
    else {
        val += "        " + temporary + "\n";
        val += "        if(" + propNameFieldValue + "->" + getter + ") {" + safePropName + " = TmpValue; }\n";
    }
    val += "    }";

    return val;
}

// specialization for array of strings
var getArrayStringPropertyDeserializer = exports.getArrayStringPropertyDeserializer = function (property, datatype)
{
    var isOptional = property.optional;
    var optionalOption = "";

    if (isOptional === false) {
        optionalOption = "HasSucceeded &= ";
    }

    if (property.actualType === "String") {
        return optionalOption + "obj->TryGetStringArrayField(TEXT(\""+ property.name+"\"),"+ property.name+");";
    }

    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}



var getArrayPropertyDeserializer = exports.getArrayPropertyDeserializer = function (property, datatype) {

    var getter = null; // represent the getter call function
    var temporary = ""; // represent the

    if (property.actualType === "String") {
        return getArrayStringPropertyDeserializer(property, datatype);
    }
    else if (property.actualType === "Boolean") {
        getter = "CurrentItem->AsBool()";
    }
    else if (property.actualType === "int16") {
        temporary = "int32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint16") {
        temporary = "uint32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "int32") {
        temporary = "int32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint32") {
        temporary = "uint32 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "int64") {
        temporary = "int64 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint64") {
        temporary = "int64 TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "float") {
        temporary = "double TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "(float)TmpValue";
    }
    else if (property.actualType === "double") {
        temporary = "double TmpValue;\n";
        temporary += "CurrentItem->TryGetNumber(TmpValue);\n";
        getter = "TmpValue";
    }
    else if (property.actualType === "DateTime") {
        getter = "readDatetime(CurrentItem)";
    }
    else if (property.isclass) {
        getter = "F" + property.actualtype + "(CurrentItem->AsObject())";
    }
    else if (property.isenum) {
        getter = "read" + property.actualtype + "FromValue(CurrentItem)";
    }
    else if (property.actualType === "object") {
        getter = "FMultitypeVar(CurrentItem)";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    //var val = "const Value::Member* " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n";
    //val += "    if (" + property.name + "_member != NULL) {\n";
    //val += "        const rapidjson::Value& memberList = " + property.name + "_member->value;\n";
    //val += "        for (SizeType i = 0; i < memberList.Size(); i++) {\n";
    //val += "            " + property.name + ".push_back(" + getter + ");\n        }\n    }";


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


    //const TArray< TSharedPtr<FJsonValue> >& ActiveRegionsArray = PlayFabJsonHelpers::ReadArray(obj,TEXT ("ActiveRegions"));
    //for (int32 Idx = 0; Idx < ActiveRegionsArray->Num(); Idx++)
    //{
    //    TSharedPtr<FJsonValue> CurrentItem = ActiveRegionsArray[Idx];
    //    Region Value = readRegionFromValue(CurrentItem);
    //    ActiveRegions.Add(Value);
    //}

    return val;
}

var getMapPropertyDeserializer = exports.getMapPropertyDeserializer = function (property, datatype) {
    var getter = null;
    var temporary = "";

    if (property.actualType === "String") {
        getter = "It.Value()->AsString()";
    }
    else if (property.actualType === "Boolean") {
        getter = "It.Value()->AsBool()";
    }
    else if (property.actualType === "int16") {
        temporary = "int32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint16") {
        temporary = "uint32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "int32") {
        temporary = "int32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint32") {
        temporary = "uint32 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "int64") {
        temporary = "int64 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "uint64") {
        temporary = "int64 TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "float") {
        temporary = "double TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "(float)TmpValue";
    }
    else if (property.actualType === "double") {
        temporary = "double TmpValue; It.Value()->TryGetNumber(TmpValue);";
        getter = "TmpValue";
    }
    else if (property.actualType === "DateTime") {
        getter = "readDatetime(It.Value())";
    }
    else if (property.isclass) {
        getter = "F"+property.actualtype + "(It.Value()->AsObject())";
    }
    else if (property.isenum) {
        getter = "read" + property.actualtype + "FromValue(It.Value())";
    }
    else if (property.actualType === "object") {
        getter = "FMultitypeVar(It.Value()->AsObject())";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    var propertyObjectName = property.name + "Object";

    var val = "const TSharedPtr<FJsonObject>* " + propertyObjectName +";\n";
    val += "    if (obj->TryGetObjectField(TEXT(\""+property.name+"\"), "+propertyObjectName+"))\n";
    val += "    {\n";
    val += "        for (TMap<FString, TSharedPtr<FJsonValue>>::TConstIterator It((*" + propertyObjectName + ")->Values); It; ++It)\n";
    val += "        {\n";
    val += "            " + temporary + "\n";
    val += "            "+property.name + ".Add(It.Key(), " + getter + ");\n";
    val += "        }\n";
    val += "    }";

//      const TSharedPtr<FJsonObject>* OutObject;
//      if (obj->TryGetObjectField(TEXT("VirtualCurrency"), OutObject))
//      {
//          for (TMap<FString, TSharedPtr<FJsonValue>>::TConstIterator It(OutObject->Values); It; ++It)
//          {
//              int32 value;
//              It.Value()->TryGetNumber(value)    ;
//              VirtualCurrency.Add(It.Key(), value);
//          }
//      }

    return val;
}

var addTypeAndDependencies = exports.addTypeAndDependencies = function (datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;

    for (var p in datatype.properties) {
        var property = datatype.properties[p];
        if (property.isclass || property.isenum) {
            var dependentType = datatypes[property.actualtype];
            addTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet)
        }
    }

    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}


// merge data types for all API
var mergeDatatypes = function (apis, outDatatypes) {

    var uniques = 0;
    var shared = 0;

    outDatatypes["Shared"] = {};

    for (var apiIndex = 0; apiIndex < apis.length; apiIndex++) {

        var api = apis[apiIndex];

        for (var dataTypeIndex in api.datatypes) {

            var datatype = api.datatypes[dataTypeIndex];

            if (outDatatypes["Shared"].hasOwnProperty(dataTypeIndex) == false) {
                // assign
                outDatatypes["Shared"][dataTypeIndex] = datatype;
                shared++;
            }
            else {

                try {
                    // just to make sure, deep compare
                    assert.deepEqual(outDatatypes["Shared"][dataTypeIndex], datatype);
                }
                catch (e) {

                    if (outDatatypes.hasOwnProperty(api.name) === false) {
                        outDatatypes[api.name] = {};
                    }

                    outDatatypes[api.name][dataTypeIndex] = datatype;
                    uniques++;
                }
            }
        }
    }

    console.log(">> mergeDatatypes");
    console.log("Found %d shared datatypes", shared);
    console.log("Found %d unique datatypes", uniques);
}

var generateModels = exports.generateModels = function (apis, apiOutputDir, libraryName, subdir) {
    var sourceDir = __dirname;

    for (var a in apis) {
        var api = apis[a];

        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};

        for (var i in api.datatypes) {
            var datatype = api.datatypes[i];
            addTypeAndDependencies(datatype, api.datatypes, orderedTypes, addedSet);
        }

        var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabDataModels.h.ejs")));
        var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabDataModels.cpp.ejs")));

        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.getPropertyDef = getPropertyDef;
        modelLocals.getPropertySerializer = getPropertySerializer;
        modelLocals.getPropertyDeserializer = getPropertyDeserializer;
        modelLocals.getPropertyDefaultValue = getPropertyDefaultValue;
        modelLocals.getPropertyCopyValue = getPropertyCopyValue;
        modelLocals.getPropertySafeName = getPropertySafeName;
        modelLocals.getPropertyDescription = getPropertyDescription;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Public/"+ subdir +"/PlayFab" + api.name + "DataModels.h"), generatedHeader);

        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "PlayFab" + api.name + "DataModels.cpp"), generatedBody);
    }
}

var getPropertyDescription = function (property)
{
    var optional = property.optional == true ? "[optional] ": "";

    return "// " + optional + property.description;
}


var generateErrors = exports.generateErrors = function (api, apiOutputDir, subDir) {
    var sourceDir = __dirname;

    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabError.h.ejs")));

    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "Public/" + subDir + "PlayFabError.h"), generatedErrors);
}


var getAuthParams = exports.getAuthParams = function (apiCall) {
    if (apiCall.auth === "SecretKey")
        return "TEXT(\"X-SecretKey\"), PlayFabSettings::developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "TEXT(\"X-Authorization\"), mUserSessionTicket";

    return "TEXT(\"\"), TEXT(\"\")";
}


var getRequestActions = exports.getRequestActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")) {
        return "if (PlayFabSettings::titleId.Len() > 0)\n        request.TitleId = PlayFabSettings::titleId;";
    }
    return "";
}

var getResultActions = exports.getResultActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "if (outResult.SessionTicket.Len() > 0)\n            {\n                mUserSessionTicket = outResult.SessionTicket;\n            }";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "if (outResult.Url.Len() > 0)\n            {\n                PlayFabSettings::logicServerURL = outResult.Url;\n            }";
    return "";
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings::getLogicURL(TEXT(\"" + apiCall.url + "\"))";
    return "PlayFabSettings::getURL(TEXT(\"" + apiCall.url + "\"))";
}

