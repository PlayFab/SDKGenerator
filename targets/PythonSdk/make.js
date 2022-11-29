var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
var cPythonLineComment = "\"\"\"";
var cPythonNewLineComment = "\"\"\"\n";

// moves over setup.py and uploadPython.sh
function copyOverScripts(apis, sourceDir, apiOutputDir)
{
    var srcDir = path.resolve(sourceDir, "source");
    var locals = {
        apis: apis,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };
    templatizeTree(locals, srcDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var locals = {
        apis: apis,
        buildIdentifier: sdkGlobals.buildIdentifier,
        friendlyName: "PlayFab Python Combined Sdk",
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    console.log("Generating Combined Client/Server api from: " + sourceDir + " to: " + apiOutputDir);

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        if (apis[i] != null) {
            makeApi(apis[i], sourceDir, apiOutputDir);
        }
    }

    copyOverScripts(apis, sourceDir, apiOutputDir);
}

// TODO: comment back in when Models are ready
//function makeDataTypes(apis, sourceDir, apiOutputDir) {
//    var modelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Model.py.ejs"));
//    var modelsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Models.py.ejs"));
//    var enumTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Enum.py.ejs"));
//    var jsonTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabJson.py.ejs"));

//    var makeDatatype = function (datatype, api) {
//        var modelLocals = {
//            api: api,
//            datatype: datatype,
//            multiTab: multiTab,
//            generateApiSummary: generateApiSummary,
//            getModelPropertyDef: getModelPropertyDef,
//            getPropertyAttribs: getPropertyAttribs,
//            getBaseTypeSyntax: getBaseTypeSyntax,
//            getDeprecationAttribute: getDeprecationAttribute,
//            getDefaultValueForType: getDefaultValueForType,
//            addInitializeFunction: addInitializeFunction,
//            getJsonSerialization: getJsonSerialization,
//            getComparator: getComparator,
//        };

//        writeFile(path.resolve(apiOutputDir, "source/PlayFabJson.py"), jsonTemplate(modelLocals));

//        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
//    };

//    for (var a = 0; a < apis.length; a++) {
//        var modelsLocal = {
//            api: apis[a],
//            makeDatatype: makeDatatype
//        };

//        writeFile(path.resolve(apiOutputDir, "source/playfab" + apis[a].name + "Models.py"), modelsTemplate(modelsLocal));
//    }
//}

function makeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating Python " + api.name + " library to " + apiOutputDir);

    var apiLocals = {
        api: api,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        generateApiSummary: generateApiSummary,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.py.ejs"));
    writeFile(path.resolve(apiOutputDir, "playfab/PlayFab" + api.name + "API.py"), apiTemplate(apiLocals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "None";
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true" : "false";

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + cPythonLineComment + tabbing + "# [Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n" + tabbing + cPythonLineComment;
    else if (isDeprecated)
        return tabbing + cPythonLineComment + tabbing + "# [Obsolete(\"No longer available\", " + isError + ")]\n" + tabbing + cPythonLineComment;
    return "";
}

// TODO: This will be needed for Model Generation
//function getBaseTypeSyntax(datatype) {
//    var parents = [];
    
//    if (datatype.className.toLowerCase().endsWith("request"))
//        parents.push("PlayFabHTTP.PlayFabRequestCommon");
//    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
//        parents.push("PlayFabHTTP.PlayFabResultCommon");
//    else {
//        parents.push("PlayFabHTTP.PlayFabBaseObject");
//    }

//    //parents.push("PlayFabHTTP.Serializable")

//    if (parents.length > 0) {
//        var output = "(";
//        for (var i = 0; i < parents.length; i++) {
//            if (i !== 0)
//                output += ", ";
//            output += parents[i];
//        }
//        output += ")"
//    }
//    return output;
//}

function getPropertyAttribs(tabbing, property, datatype, api) {
    var attribs = "";

    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += tabbing + "# [Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n";
        else
            attribs += tabbing + "# [Unordered]\n";
    }

    return attribs;
}

//function getModelPropertyDef(property, datatype) {
//    var basicType;
//    if (property.collection) {
//        basicType = getPropertyCsType(property, datatype, false);

//        if (property.collection === "array")
//            return "List<" + basicType + "> " + property.name;
//        else if (property.collection === "map")
//            return "Dictionary<string," + basicType + "> " + property.name;
//        else
//            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
//    }
//    else {
//        basicType = getPropertyCsType(property, datatype, true);
//        return basicType + " " + property.name;
//    }
//    return property.name;
//}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFabSettings._internalSettings.EntityToken";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings._internalSettings.ClientSessionTicket";
    return "None, None";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request[\"TitleId\"] = PlayFabSettings.TitleId or request.TitleId\n"
            + tabbing + "if not request[\"TitleId\"]:\n"
            + tabbing + "    raise PlayFabErrors.PlayFabException(\"Must be have TitleId set to call this method\")\n\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "if not PlayFabSettings._internalSettings.EntityToken:\n"
            + tabbing + "    raise PlayFabErrors.PlayFabException(\"Must call GetEntityToken before calling this method\")\n\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "if not PlayFabSettings._internalSettings.ClientSessionTicket:\n"
            + tabbing + "    raise PlayFabErrors.PlayFabException(\"Must be logged in to call this method\")\n\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "if not PlayFabSettings.DeveloperSecretKey:\n"
            + tabbing + "    raise PlayFabErrors.PlayFabException(\"Must have DeveloperSecretKey set to call this method\")\n\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "authKey = None\n"
            + tabbing + "authValue = None\n"
            + tabbing + "if PlayFabSettings._internalSettings.EntityToken:\n"
            + tabbing + "    authKey = \"X-EntityToken\"\n"
            + tabbing + "    authValue = PlayFabSettings._internalSettings.EntityToken\n"
            + tabbing + "elif PlayFabSettings._internalSettings.ClientSessionTicket:\n"
            + tabbing + "    authKey = \"X-Authorization\"\n"
            + tabbing + "    authValue = PlayFabSettings._internalSettings.ClientSessionTicket \n"
            + tabbing + "elif PlayFabSettings.DeveloperSecretKey:\n"
            + tabbing + "    authKey = \"X-SecretKey\"\n"
            + tabbing + "    authValue = PlayFabSettings.DeveloperSecretKey \n\n";
    return "";
}

function getResultActions(tabbing, apiCall, api) {
    if (apiCall.result === "LoginResult")
        return tabbing + "if playFabResult:\n" 
            + tabbing + "    PlayFabSettings._internalSettings.ClientSessionTicket = playFabResult[\"SessionTicket\"] if \"SessionTicket\" in playFabResult else PlayFabSettings._internalSettings.ClientSessionTicket\n"
            + tabbing + "    PlayFabSettings._internalSettings.EntityToken = playFabResult[\"EntityToken\"][\"EntityToken\"] if \"EntityToken\" in playFabResult else PlayFabSettings._internalSettings.EntityToken\n";
    else if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "if playFabResult:\n" 
            + tabbing + "    PlayFabSettings._internalSettings.ClientSessionTicket = playFabResult[\"SessionTicket\"] if \"SessionTicket\" in playFabResult else PlayFabSettings._internalSettings.ClientSessionTicket\n";
    else if (apiCall.result === "GetEntityTokenResponse")
        return tabbing + "if playFabResult:\n"
            + tabbing + "    PlayFabSettings._internalSettings.EntityToken = playFabResult[\"EntityToken\"] if \"EntityToken\" in playFabResult else PlayFabSettings._internalSettings.EntityToken\n";
    else if (apiCall.result === "AuthenticateCustomIdResult")
        return tabbing + "if playFabResult:\n"
            + tabbing + "    PlayFabSettings._internalSettings.EntityToken = playFabResult[\"EntityToken\"][\"EntityToken\"]  if \"EntityToken\" in playFabResult and \"EntityToken\" in playFabResult[\"EntityToken\"] else PlayFabSettings._internalSettings.EntityToken\n";
    return "";
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true" : "false";

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "# [Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n";
    else if (isDeprecated)
        return tabbing + "# [Obsolete(\"No longer available\", " + isError + ")]\n";
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);
    var tabbedLineComment = tabbing + cPythonNewLineComment;

    var output;
    if (lines.length === 1) {
        output = tabbing + cPythonLineComment + " "+ lines.join("\n") + " " + tabbedLineComment + "\n";
    } else if (lines.length > 0) {
        output = tabbedLineComment + tabbing + lines.join("\n" + tabbing) + "\n" + tabbedLineComment;
    } else {
        output = "";
    }
    return output;
}

// TODO: This will be needed for Model generation in the future
//function getComparator(tabbing, dataTypeName, dataTypeSortKey)
//{
//    //var output = multiTab(tabbing, 3) + "def __eq__(self, " + dataTypeName + " other):\n" +
//    var output = multiTab(tabbing, 2) + "def __eq__(self, other):\n" +
//        multiTab(tabbing, 3) + "if other == None or other." + dataTypeSortKey + " == None:\n" +
//        multiTab(tabbing, 4) + "return 1\n" +
//        multiTab(tabbing, 3) + "if " + dataTypeSortKey + " == None:\n" +
//        multiTab(tabbing, 4) + "return -1\n"+
//        multiTab(tabbing, 3) + "return "+dataTypeSortKey+".__eq__(self."+dataTypeSortKey+", other."+dataTypeSortKey+")\n";

//    return output;
//}

//function multiTab(tabbing, numTabs)
//{
//    var finalTabbing = "";
//    while (numTabs != 0)
//    {
//        finalTabbing += tabbing;
//        numTabs--;
//    }
//    return finalTabbing;
//}

// TODO: This will be needed for Model Generation
//function getDefaultValueForType(property, datatype) {

//    if (property.jsontype === "Number")
//        return "0";
//    if (datatype.jsontype === "String")
//        return "\"\"";
//    if(datatype.JsonType === "Object" && datatype.isOptional)
//        return "None";
//    //if(datatype.JsonType === "Object")
//    //    return "new " + ?namespace ? + datatype.actualtype + "()";
//    if(datatype.JsonType === "Object")
//        return "new " + datatype.actualtype + "()";

//    if (property.actualtype === "String")
//        return "\"\"";
//    else if (property.actualtype === "Boolean")
//        return "False";
//    else if (property.actualtype === "int16")
//        return "0";
//    else if (property.actualtype === "uint16")
//        return "0";
//    else if (property.actualtype === "int32")
//        return "0";
//    else if (property.actualtype === "uint32")
//        return "0";
//    else if (property.actualtype === "int64")
//        return "0";
//    else if (property.actualtype === "uint64")
//        return "0";
//    else if (property.actualtype === "float")
//        return "0.0";
//    else if (property.actualtype === "double")
//        return "0.0";
//    else if (property.actualtype === "DateTime")
//        return "datetime.min";
//    else if (property.isclass)
//        return property.actualtype + "()";
//    else if (property.isenum)
//        return property.actualtype;
//    else if (property.actualtype === "object")
//        return "None";
//    else
//        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
//}
//
//function addInitializeFunction(tabbing, propertySize)
//{
//    return tabbing + (propertySize > 0 ? "def __init__(self):" : "def __init__(self):\n"+tabbing+"    pass");
//}
