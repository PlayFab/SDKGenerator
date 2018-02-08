var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    makeApiInternal(apis, sourceDir, apiOutputDir, "Client");
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    makeApiInternal(apis, sourceDir, apiOutputDir, "Server");
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    makeApiInternal(apis, sourceDir, apiOutputDir, "All");
}

function makeApiInternal(apis, sourceDir, apiOutputDir, libname) {
    console.log("Generating Cocos2d-x C++ " + libname + " SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);

    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);

    generateModels(apis, sourceDir, apiOutputDir, libname);
    generateErrors(apis[0], sourceDir, apiOutputDir);
    generateSettings(apis, sourceDir, apiOutputDir);

    var locals = {
        apis: apis
    };

    templatizeTree(locals, path.resolve(sourceDir, "ExampleTemplate"), path.resolve(apiOutputDir, "../PlayFabSdkExample"));
}

function generateSettings(apis, sourceDir, apiOutputDir) {
    var locals = {
        buildIdentifier: exports.buildIdentifier,
        hasClientOptions: false,
        hasServerOptions: false,
        sdkVersion: exports.sdkVersion
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            locals.hasClientOptions = true;
        else if (apis[i].name !== "Entity")
            locals.hasServerOptions = true;
    }

    var settingsTemplateh = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.h.ejs"));;
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.h"), settingsTemplateh(locals));

    var settingsTemplateCpp = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.cpp.ejs"));;
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.cpp"), settingsTemplateCpp(locals));
}

function makeApi(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getUrlAccessor: getUrlAccessor,
        hasRequest: hasRequest,
        getDeprecationAttribute: getDeprecationAttribute,
        hasClientOptions: api.name === "Client"
    };

    var apiHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs"));;
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "API.h"), apiHeaderTemplate(locals));

    var apiBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs"));;
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "API.cpp"), apiBodyTemplate(locals));
}

function hasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function getPropertyDef(tabbing, property, datatype) {
    var safePropName = getPropertySafeName(property);

    if (property.collection === "array")
        return getDeprecationAttribute(tabbing, property) + tabbing + "std::list<" + getPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return getDeprecationAttribute(tabbing, property) + tabbing + "std::map<std::string, " + getPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else
        return getDeprecationAttribute(tabbing, property) + tabbing + getPropertyCppType(property, datatype, true) + " " + safePropName + ";";
}

// NOTE: variable names can't be the same as the variable type when compiling for android
function getPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function getPropertyCppType(property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;

    if (property.actualtype === "String")
        return "std::string";
    else if (property.actualtype === "Boolean")
        return isOptional ? "OptionalBool" : "bool";
    else if (property.actualtype === "int16")
        return isOptional ? "OptionalInt16" : "Int16";
    else if (property.actualtype === "uint16")
        return isOptional ? "OptionalUint16" : "Uint16";
    else if (property.actualtype === "int32")
        return isOptional ? "OptionalInt32" : "Int32";
    else if (property.actualtype === "uint32")
        return isOptional ? "OptionalUint32" : "Uint32";
    else if (property.actualtype === "int64")
        return isOptional ? "OptionalInt64" : "Int64";
    else if (property.actualtype === "uint64")
        return isOptional ? "OptionalInt64" : "Uint64";
    else if (property.actualtype === "float")
        return isOptional ? "OptionalFloat" : "float";
    else if (property.actualtype === "double")
        return isOptional ? "OptionalDouble" : "double";
    else if (property.actualtype === "DateTime")
        return isOptional ? "OptionalTime" : "time_t";
    else if (property.isclass)
        return isOptional ? property.actualtype + "*" : property.actualtype; // sub object
    else if (property.isenum)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype; // enum
    else if (property.actualtype === "object")
        return "MultitypeVar";
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
        return isOptional ? "NULL" : ""; // sub object
    else if (property.isenum)
        return ""; // enum
    else if (property.actualtype === "object")
        return "";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyCopyValue(property) {
    var safePropName = getPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection)
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : NULL";
    return "src." + safePropName;
}

function getPropertySerializer(property, datatype) {
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
        writer = "writer.String(" + safePropName + ".c_str());";
        tester = safePropName + ".length() > 0";
    }
    else if (propType === "Boolean") {
        writer = "writer.Bool(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int16") {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint16") {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int32") {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint32") {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int64") {
        writer = "writer.Int64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint64") {
        writer = "writer.Uint64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "float") {
        writer = "writer.Double(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "double") {
        writer = "writer.Double(" + safePropName + ");";
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
        tester = safePropName + " != NULL";
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
        return "if (" + tester + ") { writer.String(\"" + propName + "\"); " + writer + " }";
    return "writer.String(\"" + propName + "\"); " + writer;
}

function getArrayPropertySerializer(property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCppType(property, datatype, false);

    if (property.actualtype === "String")
        writer = "writer.String(iter->c_str());";
    else if (property.actualtype === "Boolean")
        writer = "writer.Bool(*iter);";
    else if (property.actualtype === "int16")
        writer = "writer.Int(*iter);";
    else if (property.actualtype === "uint16")
        writer = "writer.Uint(*iter);";
    else if (property.actualtype === "int32")
        writer = "writer.Int(*iter);";
    else if (property.actualtype === "uint32")
        writer = "writer.Uint(*iter);";
    else if (property.actualtype === "int64")
        writer = "writer.Int64(*iter);";
    else if (property.actualtype === "uint64")
        writer = "writer.Uint64(*iter);";
    else if (property.actualtype === "float")
        writer = "writer.Double(*iter);";
    else if (property.actualtype === "double")
        writer = "writer.Double(*iter);";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime(*iter, writer);";
    else if (property.isclass)
        writer = "iter->writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON(*iter, writer);";
    else if (property.actualtype === "object")
        writer = "iter->writeJSON(writer);";
    else
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;

    var collectionWriter = "writer.StartArray();\n    ";
    collectionWriter += "for (std::list<" + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); iter++) {\n        ";
    collectionWriter += writer + "\n    }\n    ";
    collectionWriter += "writer.EndArray();\n    ";

    if (isOptional)
        return "if (!" + propName + ".empty()) {\n    writer.String(\"" + propName + "\");\n    " + collectionWriter + " }";
    return "writer.String(\"" + propName + "\");\n    " + collectionWriter;
}

function getMapPropertySerializer(property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCppType(property, datatype, false);

    if (property.actualtype === "String")
        writer = "writer.String(iter->second.c_str());";
    else if (property.actualtype === "Boolean")
        writer = "writer.Bool(iter->second);";
    else if (property.actualtype === "int16")
        writer = "writer.Int(iter->second);";
    else if (property.actualtype === "uint16")
        writer = "writer.Uint(iter->second);";
    else if (property.actualtype === "int32")
        writer = "writer.Int(iter->second);";
    else if (property.actualtype === "uint32")
        writer = "writer.Uint(iter->second);";
    else if (property.actualtype === "int64")
        writer = "writer.Int64(iter->second);";
    else if (property.actualtype === "uint64")
        writer = "writer.Uint64(iter->second);";
    else if (property.actualtype === "float")
        writer = "writer.Double(iter->second);";
    else if (property.actualtype === "double")
        writer = "writer.Double(iter->second);";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime(iter->second, writer);";
    else if (property.isclass)
        writer = "iter->second.writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON(iter->second, writer);";
    else if (property.actualtype === "object")
        writer = "iter->second.writeJSON(writer);";
    else
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;

    var collectionWriter = "writer.StartObject();\n    ";
    collectionWriter += "for (std::map<std::string, " + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); ++iter) {\n        ";
    collectionWriter += "writer.String(iter->first.c_str()); " + writer + "\n    }\n    ";
    collectionWriter += "writer.EndObject();\n    ";

    if (isOptional)
        return "if (!" + propName + ".empty()) {\n    writer.String(\"" + propName + "\");\n    " + collectionWriter + " }";
    return "writer.String(\"" + propName + "\");\n    " + collectionWriter;
}

function getPropertyDeserializer(property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);

    if (property.collection === "array")
        return getArrayPropertyDeserializer(property, datatype);
    else if (property.collection === "map")
        return getMapPropertyDeserializer(property, datatype);

    var getter;
    if (propType === "String")
        getter = propName + "_member->value.GetString()";
    else if (propType === "Boolean")
        getter = propName + "_member->value.GetBool()";
    else if (propType === "int16")
        getter = propName + "_member->value.GetInt()";
    else if (propType === "uint16")
        getter = propName + "_member->value.GetUint()";
    else if (propType === "int32")
        getter = propName + "_member->value.GetInt()";
    else if (propType === "uint32")
        getter = propName + "_member->value.GetUint()";
    else if (propType === "int64")
        getter = propName + "_member->value.GetInt64()";
    else if (propType === "uint64")
        getter = propName + "_member->value.GetUint64()";
    else if (propType === "float")
        getter = "(float)" + propName + "_member->value.GetDouble()";
    else if (propType === "double")
        getter = propName + "_member->value.GetDouble()";
    else if (propType === "DateTime")
        getter = "readDatetime(" + propName + "_member->value)";
    else if (property.isclass && property.optional)
        getter = "new " + propType + "(" + propName + "_member->value)";
    else if (property.isclass && !property.optional)
        getter = propType + "(" + propName + "_member->value)";
    else if (property.isenum)
        getter = "read" + propType + "FromValue(" + propName + "_member->value)";
    else if (propType === "object")
        getter = "MultitypeVar(" + propName + "_member->value)";
    else
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;

    var val = "const Value::ConstMemberIterator " + propName + "_member = obj.FindMember(\"" + propName + "\");\n";
    val += "    if (" + propName + "_member != obj.MemberEnd() && !" + propName + "_member->value.IsNull()) " + safePropName + " = " + getter + ";";
    return val;
}

function getArrayPropertyDeserializer(property, datatype) {
    var getter;
    if (property.actualtype === "String")
        getter = "memberList[i].GetString()";
    else if (property.actualtype === "Boolean")
        getter = "memberList[i].GetBool()";
    else if (property.actualtype === "int16")
        getter = "memberList[i].GetInt()";
    else if (property.actualtype === "uint16")
        getter = "memberList[i].GetUint()";
    else if (property.actualtype === "int32")
        getter = "memberList[i].GetInt()";
    else if (property.actualtype === "uint32")
        getter = "memberList[i].GetUint()";
    else if (property.actualtype === "int64")
        getter = "memberList[i].GetInt64()";
    else if (property.actualtype === "uint64")
        getter = "memberList[i].GetUint64()";
    else if (property.actualtype === "float")
        getter = "(float)memberList[i].GetDouble()";
    else if (property.actualtype === "double")
        getter = "memberList[i].GetDouble()";
    else if (property.actualtype === "DateTime")
        getter = "readDatetime(memberList[i])";
    else if (property.isclass)
        getter = property.actualtype + "(memberList[i])";
    else if (property.isenum)
        getter = "read" + property.actualtype + "FromValue(memberList[i])";
    else if (property.actualtype === "object")
        getter = "MultitypeVar(memberList[i])";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    var val = "const Value::ConstMemberIterator " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n";
    val += "    if (" + property.name + "_member != obj.MemberEnd()) {\n";
    val += "        const rapidjson::Value& memberList = " + property.name + "_member->value;\n";
    val += "        for (SizeType i = 0; i < memberList.Size(); i++) {\n";
    val += "            " + property.name + ".push_back(" + getter + ");\n        }\n    }";
    return val;
}

function getMapPropertyDeserializer(property, datatype) {
    var getter;
    if (property.actualtype === "String")
        getter = "iter->value.GetString()";
    else if (property.actualtype === "Boolean")
        getter = "iter->value.GetBool()";
    else if (property.actualtype === "int16")
        getter = "iter->value.GetInt()";
    else if (property.actualtype === "uint16")
        getter = "iter->value.GetUint()";
    else if (property.actualtype === "int32")
        getter = "iter->value.GetInt()";
    else if (property.actualtype === "uint32")
        getter = "iter->value.GetUint()";
    else if (property.actualtype === "int64")
        getter = "iter->value.GetInt64()";
    else if (property.actualtype === "uint64")
        getter = "iter->value.GetUint64()";
    else if (property.actualtype === "float")
        getter = "(float)iter->value.GetDouble()";
    else if (property.actualtype === "double")
        getter = "iter->value.GetDouble()";
    else if (property.actualtype === "DateTime")
        getter = "readDatetime(iter->value)";
    else if (property.isclass)
        getter = property.actualtype + "(iter->value)";
    else if (property.isenum)
        getter = "read" + property.actualtype + "FromValue(iter->value)";
    else if (property.actualtype === "object")
        getter = "MultitypeVar(iter->value)";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    var val = "const Value::ConstMemberIterator " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n";
    val += "    if (" + property.name + "_member != obj.MemberEnd()) {\n";
    val += "        for (Value::ConstMemberIterator iter = " + property.name + "_member->value.MemberBegin(); iter != " + property.name + "_member->value.MemberEnd(); ++iter) {\n";
    val += "            " + property.name + "[iter->name.GetString()] = " + getter + ";\n        }\n    }";
    return val;
}

function addTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;

    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            if (property.isclass || property.isenum) {
                var dependentType = datatypes[property.actualtype];
                addTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet);
            }
        }
    }

    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

function generateModels(apis, sourceDir, apiOutputDir, libraryName) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];

        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        for (var i in api.datatypes)
            addTypeAndDependencies(api.datatypes[i], api.datatypes, orderedTypes, addedSet);

        var locals = {
            api: api,
            datatypes: orderedTypes,
            getPropertyDef: getPropertyDef,
            getPropertySerializer: getPropertySerializer,
            getPropertyDeserializer: getPropertyDeserializer,
            getPropertyDefaultValue: getPropertyDefaultValue,
            getPropertyCopyValue: getPropertyCopyValue,
            getPropertySafeName: getPropertySafeName,
            getDeprecationAttribute: getDeprecationAttribute,
            libraryName: libraryName
        };

        var modelHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs"));
        writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "DataModels.h"), modelHeaderTemplate(locals));

        var modelBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabDataModels.cpp.ejs"));
        writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "DataModels.cpp"), modelBodyTemplate(locals));
    }
}

function generateErrors(api, sourceDir, apiOutputDir) {
    var locals = {
        errorList: api.errorList,
        errors: api.errors
    };

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabError.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabError.h"), errorsTemplate(locals));
}

function getAuthParams(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "httpRequest->SetHeader(authKey, authValue);\n";
    else if (apiCall.auth === "EntityToken")
        return tabbing + "httpRequest->SetHeader(\"X-EntityToken\", PlayFabSettings::entityToken);\n";
    else if (apiCall.auth === "SecretKey")
        return tabbing + "httpRequest->SetHeader(\"X-SecretKey\", PlayFabSettings::developerSecretKey);\n";
    else if (apiCall.auth === "SessionTicket")
        return tabbing + "httpRequest->SetHeader(\"X-Authorization\", PlayFabSettings::clientSessionTicket);\n";
    return "";
}

var getRequestActions = function (tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "std::string authKey, authValue;\n"
            + tabbing + "if (PlayFabSettings::clientSessionTicket.length() > 0) {\n"
            + tabbing + "    authKey = \"X-Authorization\"; authValue = PlayFabSettings::clientSessionTicket;\n"
            + tabbing + "} else if (PlayFabSettings::developerSecretKey.length() > 0) {\n"
            + tabbing + "    authKey = \"X-SecretKey\"; authValue = PlayFabSettings::developerSecretKey;\n"
            + tabbing + "} else if (PlayFabSettings::entityToken.length() > 0) {\n"
            + tabbing + "    authKey = \"X-EntityToken\"; authValue = PlayFabSettings::entityToken;\n"
            + tabbing + "}\n";
    else if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "if (PlayFabSettings::titleId.length() > 0)\n"
            + tabbing + "    request.TitleId = PlayFabSettings::titleId;\n";
    return "";
}

var getResultActions = function (tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "if (outResult.EntityToken.length() > 0)\n"
            + tabbing + "    PlayFabSettings::entityToken = outResult.EntityToken;\n";
    else if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (outResult.SessionTicket.length() > 0)\n"
            + tabbing + "    PlayFabSettings::clientSessionTicket = outResult.SessionTicket;\n"
            + tabbing + "MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n\n";
    else if (apiCall.result === "AttributeInstallResult")
        return tabbing + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings::advertisingIdType += \"_Successful\";\n\n";
    return "";
}

function getUrlAccessor(apiCall) {
    return "PlayFabSettings::getURL(\"" + apiCall.url + "\")";
}

function getDeprecationAttribute(tabbing, apiObj) {
    // In C++ there's all kinds of platform-dependent ways to mark deprecation, and they all seem flaky and unreliable.
    // After a lot of investigation, a comment just seems like the easiest and most consistent solution.
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "// Deprecated - Use '" + apiObj.deprecation.ReplacedBy + "' instead\n";
    else if (isDeprecated)
        return tabbing + "// Deprecated - Do not use\n";
    return "";
}
