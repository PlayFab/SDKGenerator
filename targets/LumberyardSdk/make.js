var path = require("path");

// Lumberyard has pretty significantly different imports from the other C++ sdks
// It is also more closely structured like UnitySDK, and should hopefully be closer to implementing the
//   global callback system.  So for now, there is no shared code between the other C++ sdks and lumberyard.

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating Lumberyard C++ client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeAPI(api, apiOutputDir);
    generateModels([api], apiOutputDir, "Client");
    generateErrors(api, apiOutputDir);
    generateSimpleFiles([api], sourceDir, apiOutputDir);
    makeAPIProject([api], sourceDir, apiOutputDir, "Client");
}

//exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
//    console.log("Generating Windows C++ server SDK to " + apiOutputDir);

//    copyTree(path.resolve(sourceDir, "../cpp-shared/source"), apiOutputDir);
//    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);

//    for (var i in apis)
//        shared.makeAPI(apis[i], apiOutputDir, "core/");
//    shared.generateModels(apis, apiOutputDir, "Server", "core/");
//    shared.generateErrors(apis[0], apiOutputDir);
//    generateSimpleFiles(apis, sourceDir, apiOutputDir);
//    makeAPIProject(apis, sourceDir, apiOutputDir, "Server");
//}

//exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
//    console.log("Generating Windows C++ combined SDK to " + apiOutputDir);

//    copyTree(path.resolve(sourceDir, "../cpp-shared/source"), apiOutputDir);
//    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
//    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "build/VC12/UnittestRunner"));

//    for (var i in apis)
//        shared.makeAPI(apis[i], apiOutputDir, "core/");
//    shared.generateModels(apis, apiOutputDir, "All", "core/");
//    shared.generateErrors(apis[0], apiOutputDir);
//    generateSimpleFiles(apis, sourceDir, apiOutputDir);
//    makeAPIProject(apis, sourceDir, apiOutputDir, "All");
//}

function makeAPIProject(apis, sourceDir, apiOutputDir, libname) {
    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var locals = {};
    locals.sdkVersion = exports.sdkVersion;
    locals.apis = apis;
    locals.hasClientOptions = false;
    locals.hasServerOptions = false;
    for (var i in apis) {
        if (apis[i].name === "Client") locals.hasClientOptions = true;
        if (apis[i].name !== "Client") locals.hasServerOptions = true;
    }

    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/gem.json.ejs")));
    var generatedProject = vcProjTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "gem.json"), generatedProject);

    var wafTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/playfabsdk.waf_files.ejs")));
    var generatedWaf = wafTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "Code/playfabsdk.waf_files"), generatedWaf);

    var hSettingTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.h.ejs")));
    var generatedSettingH = hSettingTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabSettings.h"), generatedSettingH);

    var cppSettingTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cpp.ejs")));
    var generatedSettingCpp = cppSettingTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabSettings.cpp"), generatedSettingCpp);
}

var makeAPI = function (api, apiOutputDir) {
    var sourceDir = __dirname;
    
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.hasRequest = hasRequest;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.hasClientOptions = api.name === "Client";
    
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + api.name + "API.h"), generatedHeader);
    
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + api.name + "API.cpp"), generatedBody);
}

var hasRequest = function (apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

var getPropertyDef = function (property, datatype) {
    
    var safePropName = getPropertySafeName(property);
    
    if (property.collection === "array")
        return "std::list<" + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return "std::map<Aws::String, " + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
    else
        return getPropertyCPPType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
var getPropertySafeName = function (property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

var getPropertyCPPType = function (property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype === "String")
        return "Aws::String";
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

var getPropertyDefaultValue = function (property, datatype) {
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

var getPropertyCopyValue = function (property, datatype) {
    var safePropName = getPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection)
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : NULL";
    return "src." + safePropName;
}

var getPropertySerializer = function (property, datatype) {
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

var getArrayPropertySerializer = function (property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);
    
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

var getMapPropertySerializer = function (property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);
    
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
    collectionWriter += "for (std::map<Aws::String, " + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); ++iter) {\n        ";
    collectionWriter += "writer.String(iter->first.c_str()); " + writer + "\n    }\n    ";
    collectionWriter += "writer.EndObject();\n    ";
    
    if (isOptional)
        return "if (!" + propName + ".empty()) {\n    writer.String(\"" + propName + "\");\n    " + collectionWriter + " }";
    return "writer.String(\"" + propName + "\");\n    " + collectionWriter;
}

var getPropertyDeserializer = function (property, datatype) {
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

var getArrayPropertyDeserializer = function (property, datatype) {
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

var getMapPropertyDeserializer = function (property, datatype) {
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

var addTypeAndDependencies = function (datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;
    
    for (var p in datatype.properties) {
        var property = datatype.properties[p];
        if (property.isclass || property.isenum) {
            var dependentType = datatypes[property.actualtype];
            addTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet);
        }
    }
    
    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

var generateModels = function (apis, apiOutputDir, libraryName, subdir) {
    var sourceDir = __dirname;
    
    for (var a in apis) {
        var api = apis[a];
        
        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        
        for (var i in api.datatypes)
            addTypeAndDependencies(api.datatypes[i], api.datatypes, orderedTypes, addedSet);
        
        var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs")));
        var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.cpp.ejs")));
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.getPropertyDef = getPropertyDef;
        modelLocals.getPropertySerializer = getPropertySerializer;
        modelLocals.getPropertyDeserializer = getPropertyDeserializer;
        modelLocals.getPropertyDefaultValue = getPropertyDefaultValue;
        modelLocals.getPropertyCopyValue = getPropertyCopyValue;
        modelLocals.getPropertySafeName = getPropertySafeName;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + api.name + "DataModels.h"), generatedHeader);
        
        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + api.name + "DataModels.cpp"), generatedBody);
    }
}

var generateErrors = function (api, apiOutputDir) {
    var sourceDir = __dirname;
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabError.h.ejs")));
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabError.h"), generatedErrors);
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab::PlayFabSettings::developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", mUserSessionTicket";
    return "\"\", \"\"";
}

var getRequestActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "    if (PlayFabSettings::titleId.length() > 0)\n        request.TitleId = PlayFabSettings::titleId;\n";
    return "";
}

var getResultActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "        if (outResult->SessionTicket.length() > 0)\n" 
            + "            PlayFabClientAPI::mUserSessionTicket = outResult->SessionTicket;\n" 
            + "        MultiStepClientLogin(outResult->SettingsForUser->NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "        // Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "        PlayFabSettings::advertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "if (outResult->Url.length() > 0) PlayFabSettings::logicServerURL = outResult->Url;\n";
    return "";
}
