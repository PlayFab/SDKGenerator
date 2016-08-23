var ejs = require("ejs");
var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";
    
    console.log("Generating Cocos2d-x C++ client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    MakeApi(api, sourceDir, apiOutputDir);
    
    GenerateModels([api], sourceDir, apiOutputDir, libname);
    GenerateErrors(api, sourceDir, apiOutputDir);
    GenerateSettings([api], sourceDir, apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";
    
    console.log("Generating Cocos2d-x C++ server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir);
    
    GenerateModels(apis, sourceDir, apiOutputDir, libname);
    GenerateErrors(apis[0], sourceDir, apiOutputDir);
    GenerateSettings(apis, sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";
    
    console.log("Generating Cocos2d-x C++ combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir);
    
    GenerateModels(apis, sourceDir, apiOutputDir, libname);
    GenerateErrors(apis[0], sourceDir, apiOutputDir);
    GenerateSettings(apis, sourceDir, apiOutputDir);

    copyTree(path.resolve(sourceDir, "ExampleSource"), path.resolve(apiOutputDir, "../PlayFabSdkExample"));
}

function GenerateSettings(apis, sourceDir, apiOutputDir) {
    var settingsTemplateh = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.h.ejs")));
    var settingsTemplateCpp = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cpp.ejs")));
    
    var settingsLocals = {};
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    settingsLocals.hasClientOptions = false;
    settingsLocals.hasServerOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettingsH = settingsTemplateh(settingsLocals);
    var generatedSettingsCpp = settingsTemplateCpp(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.h"), generatedSettingsH);
    writeFile(path.resolve(apiOutputDir, "PlayFabSettings.cpp"), generatedSettingsCpp);
}

function MakeApi(api, sourceDir, apiOutputDir) {
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.HasRequest = HasRequest;
    apiLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    apiLocals.hasClientOptions = api.name === "Client";
    
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "API.h"), generatedHeader);
    
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "API.cpp"), generatedBody);
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function GetPropertyDef(tabbing, property, datatype) {
    
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return GetDeprecationAttribute(tabbing, property) + tabbing + "std::list<" + GetPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else if (property.collection === "map")
        return GetDeprecationAttribute(tabbing, property) + tabbing + "std::map<std::string, " + GetPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    else
        return GetDeprecationAttribute(tabbing, property) + tabbing + GetPropertyCppType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetPropertyCppType(property, datatype, needOptional) {
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
        return isOptional ? "NULL" : ""; // sub object
    else if (property.isenum)
        return ""; // enum
    else if (property.actualtype === "object")
        return "";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyCopyValue(property) {
    var safePropName = GetPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection)
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : NULL";
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

function GetArrayPropertySerializer(property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);
    
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

function GetMapPropertySerializer(property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);
    
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

function GetPropertyDeserializer(property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return GetArrayPropertyDeserializer(property, datatype);
    else if (property.collection === "map")
        return GetMapPropertyDeserializer(property, datatype);
    
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

function GetArrayPropertyDeserializer(property, datatype) {
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

function GetMapPropertyDeserializer(property, datatype) {
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

function GenerateModels(apis, sourceDir, apiOutputDir, libraryName) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];
        
        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        
        for (var i in api.datatypes) {
            var datatype = api.datatypes[i];
            AddTypeAndDependencies(datatype, api.datatypes, orderedTypes, addedSet);
        }
        
        var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs")));
        var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.cpp.ejs")));
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.GetPropertyDef = GetPropertyDef;
        modelLocals.GetPropertySerializer = GetPropertySerializer;
        modelLocals.GetPropertyDeserializer = GetPropertyDeserializer;
        modelLocals.GetPropertyDefaultValue = GetPropertyDefaultValue;
        modelLocals.GetPropertyCopyValue = GetPropertyCopyValue;
        modelLocals.GetPropertySafeName = GetPropertySafeName;
        modelLocals.GetDeprecationAttribute = GetDeprecationAttribute;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "DataModels.h"), generatedHeader);
        
        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "DataModels.cpp"), generatedBody);
    }
}

function GenerateErrors(api, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabError.h.ejs")));
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabError.h"), generatedErrors);
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "httpRequest->SetHeader(\"X-SecretKey\", PlayFabSettings::developerSecretKey);";
    else if (apiCall.auth === "SessionTicket")
        return "httpRequest->SetHeader(\"X-Authorization\", mUserSessionTicket);";
    return "";
}

var GetRequestActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "if (PlayFabSettings::titleId.length() > 0)\n        request.TitleId = PlayFabSettings::titleId;";
    return "";
}

var GetResultActions = function (apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "        if (outResult.SessionTicket.length() > 0)\n" 
            + "            (static_cast<PlayFab" + api.name + "API*>(userData))->mUserSessionTicket = outResult.SessionTicket;\n" 
            + "        MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "        // Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "        PlayFabSettings::advertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "if (outResult.Url.length() > 0) PlayFabSettings::logicServerURL = outResult.Url;\n";
    return "";
}

function GetUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings::getLogicURL(\"" + apiCall.url + "\")";
    return "PlayFabSettings::getURL(\"" + apiCall.url + "\")";
}

function GetDeprecationAttribute(tabbing, apiObj) {
    // In C++ there's all kinds of platform-dependent ways to mark deprecation, and they all seem flaky and unreliable.
    // After a lot of investigation, a comment just seems like the easiest and most consistent solution.
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "// Deprecated - Use '" + apiObj.deprecation.ReplacedBy + "' instead\n";
    else if (isDeprecated)
        return tabbing + "// Deprecated - Do not use\n";
    return "";
}
