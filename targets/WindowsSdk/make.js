var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);

    var locals = {
        apis: apis,
        buildIdentifier: sdkGlobals.buildIdentifier,
        extraDefines: "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API;",
        sdkVersion: sdkGlobals.sdkVersion,
        sdkDate: sdkGlobals.sdkVersion.split(".")[2],
        sdkYear: "20" + sdkGlobals.sdkVersion.split(".")[2].substr(0, 2),
        vsVer: "v140", // If we add 141, we'll have to tweak this again
        vsYear: "2015" // If we add 2017, we'll have to tweak this again
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    for (var a2 = 0; a2 < apis.length; a2++)
        makeApiFiles(apis[a2], sourceDir, apiOutputDir);
}

function makeApiFiles(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        enumtypes: getEnumTypes(api.datatypes),
        getApiDefine: getApiDefine,
        getAuthParams: getAuthParams,
        getBaseType: getBaseType,
        getPropertyDefinition: getPropertyDefinition,
        getPropertyFromJson: getPropertyFromJson,
        getPropertyToJson: getPropertyToJson,
        getPropertySafeName: getPropertySafeName,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
        ifHasProps: ifHasProps,
        sdkVersion: sdkGlobals.sdkVersion,
        sortedClasses: getSortedClasses(api.datatypes)
    };

    var apihTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_Api.h.ejs"));;
    writeFile(path.resolve(apiOutputDir, "include/playfab", "PlayFab" + api.name + "Api.h"), apihTemplate(locals));

    var apiCppTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_Api.cpp.ejs"));;
    writeFile(path.resolve(apiOutputDir, "source", "PlayFab" + api.name + "Api.cpp"), apiCppTemplate(locals));

    var dataModelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab_DataModels.h.ejs"));;
    writeFile(path.resolve(apiOutputDir, "include/playfab", "PlayFab" + api.name + "DataModels.h"), dataModelTemplate(locals));
}

// *************************** Internal utility methods ***************************
function getEnumTypes(datatypes) {
    var enumtypes = [];

    for (var typeIdx in datatypes) // Add all types and their dependencies
        if (datatypes[typeIdx].isenum)
            enumtypes.push(datatypes[typeIdx]);
    return enumtypes;
}

function getSortedClasses(datatypes) {
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
function getApiDefine(api) {
    if (api.name === "Client")
        return "#ifndef DISABLE_PLAYFABCLIENT_API";
    if (api.name === "Matchmaker")
        return "#ifdef ENABLE_PLAYFABSERVER_API"; // Matchmaker is bound to server, which is just a legacy design decision at this point
    if (api.name === "Admin" || api.name === "Server")
        return "#ifdef ENABLE_PLAYFAB" + api.name.toUpperCase() + "_API";

    // For now, everything else is considered ENTITY
    return "#ifndef DISABLE_PLAYFABENTITY_API";
}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    switch (apiCall.auth) {
        case "None": return "L\"\", L\"\"";
        case "EntityToken": return "L\"X-EntityToken\", PlayFabSettings::entityToken";
        case "SessionTicket": return "L\"X-Authorization\", PlayFabSettings::clientSessionTicket";
        case "SecretKey": return "L\"X-SecretKey\", PlayFabSettings::developerSecretKey";
    }
    throw "getAuthParams: Unknown auth type: " + apiCall.auth + " for " + apiCall.name;
}

function getBaseType(datatype) {
    if (datatype.isRequest)
        return "PlayFabRequestCommon";
    if (datatype.isResult)
        return "PlayFabResultCommon";
    return "PlayFabBaseModel";
}

function getPropertyCppType(property, datatype, needOptional) {
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
    throw "getPropertyCppType: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyDefinition(tabbing, property, datatype) {
    var cppType = getPropertyCppType(property, datatype, !property.collection);
    var safePropName = getPropertySafeName(property);

    if (!property.collection) {
        return tabbing + cppType + " " + safePropName + ";";
    } else if (property.jsontype === "Object" && property.actualtype === "object") {
        return tabbing + cppType + " " + safePropName + "; // Not truly arbitrary. See documentation for restrictions on format";
    } else if (property.collection === "array") {
        return tabbing + "std::list<" + cppType + "> " + safePropName + ";";
    } else if (property.collection === "map") {
        return tabbing + "std::map<std::string, " + cppType + "> " + safePropName + ";";
    }
    throw "getPropertyDefinition: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyFromJson(tabbing, property, datatype) {
    var safePropName = getPropertySafeName(property);
    if (property.jsontype === "Object" && property.actualtype === "object")
        return tabbing + safePropName + " = input[L\"" + safePropName + "\"];";
    if (property.jsontype === "Object")
        return tabbing + "FromJsonUtilO(input[L\"" + safePropName + "\"], " + safePropName + ");";
    if (property.isenum && (property.collection || property.optional))
        return tabbing + "FromJsonUtilE(input[L\"" + safePropName + "\"], " + safePropName + ");";
    if (property.isenum)
        return tabbing + "FromJsonEnum(input[L\"" + safePropName + "\"], " + safePropName + ");";
    if (property.actualtype === "DateTime")
        return tabbing + "FromJsonUtilT(input[L\"" + safePropName + "\"], " + safePropName + ");";
    if (property.actualtype === "String")
        return tabbing + "FromJsonUtilS(input[L\"" + safePropName + "\"], " + safePropName + ");";
    var primitives = new Set(["Boolean", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float", "double"]);
    if (primitives.has(property.actualtype))
        return tabbing + "FromJsonUtilP(input[L\"" + safePropName + "\"], " + safePropName + ");";

    throw "getPropertyFromJson: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertyToJson(tabbing, property, datatype) {
    var safePropName = getPropertySafeName(property);
    if (property.jsontype === "Object" && property.actualtype === "object")
        return tabbing + "output[L\"" + property.name + "\"] = " + safePropName + ";";
    if (property.jsontype === "Object")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilO(" + safePropName + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";
    if (property.isenum && (property.collection || property.optional))
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilE(" + safePropName + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";
    if (property.isenum)
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonEnum(" + safePropName + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";
    if (property.actualtype === "DateTime")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilT(" + property.name + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";
    if (property.actualtype === "String")
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilS(" + safePropName + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";
    var primitives = new Set(["Boolean", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float", "double"]);
    if (primitives.has(property.actualtype))
        return tabbing + "web::json::value each_" + safePropName + "; ToJsonUtilP(" + safePropName + ", each_" + safePropName + "); output[L\"" + property.name + "\"] = each_" + safePropName + ";";

    throw "getPropertyToJson: Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (PlayFabSettings::titleId.length() > 0) request.TitleId = ShortenString(PlayFabSettings::titleId);\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "utility::string_t authKey, authValue;\n"
            + tabbing + "if (PlayFabSettings::entityToken.length() > 0) {\n"
            + tabbing + "    authKey = L\"X-EntityToken\"; authValue = PlayFabSettings::entityToken;\n"
            + tabbing + "} else if (PlayFabSettings::clientSessionTicket.length() > 0) {\n"
            + tabbing + "    authKey = L\"X-Authorization\"; authValue = PlayFabSettings::clientSessionTicket;\n"
            + tabbing + "} else if (PlayFabSettings::developerSecretKey.length() > 0) {\n"
            + tabbing + "    authKey = L\"X-SecretKey\"; authValue = PlayFabSettings::developerSecretKey;\n"
            + tabbing + "}\n";

    return "";
}

function getResultActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "if (outResult.EntityToken.length() > 0) PlayFabSettings::entityToken = WidenString(outResult.EntityToken);\n";
    if (apiCall.result === "LoginResult")
        return tabbing + "if (outResult.SessionTicket.length() > 0)\n"
            + tabbing + "{\n"
            + tabbing + "    PlayFabSettings::clientSessionTicket = WidenString(outResult.SessionTicket);\n"
            + tabbing + "    if (outResult.EntityToken.notNull()) PlayFabSettings::entityToken = WidenString(outResult.EntityToken->EntityToken);\n"
            + tabbing + "    MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n"
            + tabbing + "}\n";
    if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if (outResult.SessionTicket.length() > 0)\n"
            + tabbing + "{\n"
            + tabbing + "    PlayFabSettings::clientSessionTicket = WidenString(outResult.SessionTicket);\n"
            + tabbing + "    MultiStepClientLogin(outResult.SettingsForUser->NeedsAttribution);\n"
            + tabbing + "}\n";
    if (apiCall.result === "AttributeInstallResult")
        return tabbing + "PlayFabSettings::advertisingIdType += L\"_Successful\";\n";

    return "";
}

function ifHasProps(datatype, displayText) {
    if (datatype.properties.length === 0)
        return "";
    return displayText;
}
