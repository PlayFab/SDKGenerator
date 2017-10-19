var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeSimpleTemplates(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApiFiles(apis[i], sourceDir, apiOutputDir);
}

function MakeSimpleTemplates(apis, sourceDir, apiOutputDir) {
    var locals = {
        apis: apis,
        sdkVersion: exports.sdkVersion,
        sdkDate: exports.sdkVersion.split(".")[2],
        sdkYear: exports.sdkVersion.split(".")[2].substr(0, 2)
    };

    var errTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabError.h.ejs"));;
    var generatedErr = errTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "include/playfab", "PlayFabError.h"), generatedErr);
    
    locals.vsVer = "v120";
    locals.vsYear = "2013";
    var pkg13Template = getCompiledTemplate(path.resolve(sourceDir, "templates/com.playfab.windowssdk.v1x0.autopkg.ejs"));;
    var generatedPkg13 = pkg13Template(locals);
    writeFile(path.resolve(apiOutputDir, "build", "com.playfab.windowssdk.v120.autopkg"), generatedPkg13);

    locals.vsVer = "v140";
    locals.vsYear = "2015";
    var pkg15Template = getCompiledTemplate(path.resolve(sourceDir, "templates/com.playfab.windowssdk.v1x0.autopkg.ejs"));;
    var generatedPkg15 = pkg15Template(locals);
    writeFile(path.resolve(apiOutputDir, "build", "com.playfab.windowssdk.v140.autopkg"), generatedPkg15);
}

function MakeApiFiles(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        sdkVersion: exports.sdkVersion,
        enumtypes: GetEnumTypes(api.datatypes),
        sortedClasses: GetSortedClasses(api.datatypes),
        GetApiDefine: GetApiDefine,
        GetAuthParams: GetAuthParams,
        GetBaseType: GetBaseType,
        GetPropertyDefinition: GetPropertyDefinition,
        GetPropertyFromJson: GetPropertyFromJson,
        GetPropertyToJson: GetPropertyToJson,
        GetPropertySafeName: GetPropertySafeName,
        GetRequestActions: GetRequestActions,
        GetResultActions: GetResultActions
    };
    
    var apihTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_Api.h.ejs"));;
    var generatedApiH = apihTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "include/playfab", "PlayFab" + api.name + "Api.h"), generatedApiH);
    
    var apiCppTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_Api.cpp.ejs"));;
    var generatedApiCpp = apiCppTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "source", "PlayFab" + api.name + "Api.cpp"), generatedApiCpp);
    
    var dataModelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_DataModels.h.ejs"));;
    var generatedDataModel = dataModelTemplate(locals);
    writeFile(path.resolve(apiOutputDir, "include/playfab", "PlayFab" + api.name + "DataModels.h"), generatedDataModel);
}

// *************************** Internal utility methods ***************************
function GetEnumTypes(datatypes) {
    var enumtypes = [];
    
    for (var typeIdx in datatypes) // Add all types and their dependencies
        if (datatypes[typeIdx].isenum)
            enumtypes.push(datatypes[typeIdx]);
    return enumtypes;
}

function GetSortedClasses(datatypes) {
    var sortedClasses = [];
    var addedTypes = new Set();
    
    var addType = function (datatype) {
        if (addedTypes.has(datatype.name) || datatype.isenum)
            return;
        // In C++, dependent types must be defined first
        if (datatype.properties) {
            for (var propIdx = 0; propIdx < datatype.properties.length; propIdx++) {
                var property = datatype.properties[propIdx];
                if (property.isclass || property.isenum)
                    addType(datatypes[property.actualtype]);
            }
        }
        addedTypes.add(datatype.name);
        sortedClasses.push(datatype);
    }
    
    for (var typeIdx in datatypes) // Add all types and their dependencies
        addType(datatypes[typeIdx]);
    return sortedClasses;
}

// *************************** ejs-exposed methods ***************************
function GetApiDefine(api) {
    if (api.name === "Client")
        return "DISABLE_PLAYFABCLIENT_API";
    if (api.name === "Server" || api.name === "Matchmaker")
        return "ENABLE_PLAYFABSERVER_API";
    if (api.name === "Admin")
        return "ENABLE_PLAYFABADMIN_API";
    throw "GetApiDefine: Unknown api: " + api.name;
}

function GetAuthParams(apiCall) {
    switch (apiCall.auth) {
        case "None": return "U(\"\"), U(\"\")";
        case "SessionTicket": return "U(\"X-Authorization\"), mUserSessionTicket";
        case "SecretKey": return "U(\"X-SecretKey\"), PlayFabSettings::developerSecretKey";
    }
    throw "GetAuthParams: Unknown auth type: " + apiCall.auth + " for " + apiCall.name;
}

function GetBaseType(datatype) {
    if (datatype.className.toLowerCase().endsWith("request"))
        return "PlayFabRequestCommon";
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        return "PlayFabRequestCommon";
    return "PlayFabBaseModel";
}

function GetPropertyCppType(property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype === "String")
        return "std::string";
    else if (property.isclass)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype;
    else if (property.jsontype === "Object" && property.actualtype === "object")
        return "web::json::value";
    else if (property.actualtype === "Boolean")
        return isOptional ? "Boxed<bool>" : "bool";
    else if (property.actualtype === "int16")
        return isOptional ? "Boxed<Int16>" : "Int16";
    else if (property.actualtype === "uint16")
        return isOptional ? "Boxed<Uint16>" : "Uint16";
    else if (property.actualtype === "int32")
        return isOptional ? "Boxed<Int32>" : "Int32";
    else if (property.actualtype === "uint32")
        return isOptional ? "Boxed<Uint32>" : "Uint32";
    else if (property.actualtype === "int64")
        return isOptional ? "Boxed<Int64>" : "Int64";
    else if (property.actualtype === "uint64")
        return isOptional ? "Boxed<Uint64>" : "Uint64";
    else if (property.actualtype === "float")
        return isOptional ? "Boxed<float>" : "float";
    else if (property.actualtype === "double")
        return isOptional ? "Boxed<double>" : "double";
    else if (property.actualtype === "DateTime")
        return isOptional ? "Boxed<time_t>" : "time_t";
    else if (property.isenum)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype;
    throw "GetPropertyCppType: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyDefinition(tabbing, property, datatype) {
    var cppType = GetPropertyCppType(property, datatype, !property.collection);
    var safePropName = GetPropertySafeName(property);
    
    if (!property.collection) {
        return tabbing + cppType + " " + safePropName + ";";
    } else if (property.jsontype === "Object" && property.actualtype === "object") {
        return tabbing + cppType + " " + safePropName + "; // Not truly arbitrary. See documentation for restrictions on format";
    } else if (property.collection === "array") {
        return tabbing + "std::list<" + cppType + "> " + safePropName + ";";
    } else if (property.collection === "map") {
        return tabbing + "std::map<std::string, " + cppType + "> " + safePropName + ";";
    }
    throw "GetPropertyDefinition: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyFromJson(tabbing, property, datatype) {
    var safePropName = GetPropertySafeName(property);
    if (property.jsontype === "Object" && property.actualtype === "object")
        return tabbing + safePropName + " = input[U(\"" + safePropName + "\")];";
    if (property.jsontype === "Object")
        return tabbing + "FromJsonUtilO(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    if (property.isenum && (property.collection || property.optional))
        return tabbing + "FromJsonUtilE(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    if (property.isenum)
        return tabbing + "FromJsonEnum(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    if (property.actualtype === "DateTime")
        return tabbing + "FromJsonUtilT(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    if (property.actualtype === "String")
        return tabbing + "FromJsonUtilS(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    var primitives = new Set(["Boolean", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float", "double"]);
    if (primitives.has(property.actualtype))
        return tabbing + "FromJsonUtilP(input[U(\"" + safePropName + "\")], " + safePropName + ");";
    
    throw "GetPropertyFromJson: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyToJson(tabbing, property, datatype) {
    var safePropName = GetPropertySafeName(property);
    if (property.jsontype === "Object" && property.actualtype === "object")
        return tabbing + "output[U(\"" + property.name + "\")] = " + safePropName + ";";
    if (property.jsontype === "Object")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilO(" + safePropName + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    if (property.isenum && (property.HTMLAllCollection || property.optional))
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilE(" + safePropName + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    if (property.isenum)
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonEnum(" + safePropName + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    if (property.actualtype === "DateTime")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilT(" + property.name + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    if (property.actualtype === "String")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilS(" + safePropName + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    var primitives = new Set(["Boolean", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float", "double"]);
    if (primitives.has(property.actualtype))
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilP(" + safePropName + ", each_" + safePropName + "); output[U(\"" + property.name + "\")] = each_" + safePropName + ";";
    
    throw "GetPropertyToJson: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetRequestActions(tabbing, apiCall, api) {
    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (PlayFabSettings::titleId.length() > 0) request.TitleId = ShortenString(PlayFabSettings::titleId);\n";
    return "";
}

function GetResultActions(tabbing, apiCall, api) {
    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (outResult.SessionTicket.length() > 0)\n" 
            + tabbing + "{\n" 
            + tabbing + "    mUserSessionTicket = WidenString(outResult.SessionTicket);\n" 
            + tabbing + "    MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n" 
            + tabbing + "}\n";
    if (apiCall.result === "AttributeInstallResult")
        return tabbing + "PlayFabSettings::advertisingIdType += U(\"_Successful\");\n";
    
    return "";
}
