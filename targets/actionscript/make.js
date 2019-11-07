var fs = require("fs");
var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

var airVersion = 30; // Latest version of AirSdk installed overtop of Flex SDK

// NOTE: As of PlayFab version 191029, some objects are not properly getting recognized by ActionScript
// Due to the language getting deprecated within a year, we are going to add any breaking objects to this list
// and add the full namespace to any new object that breaks actionscript comiplation here.
var typesThatNeedFullNamespace = [ "TreatmentAssignment" ];
var expectedPlayfabNamespace = ["com", "playfab"];

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "PfApiTest"); // This is an oddity in the ActionScriptSDK which we shouldn't resolve until we do a major revision number change

    console.log("Generating ActionScript3 combined SDK to " + apiOutputDir);

    removeExcessFiles(apis, apiOutputDir);

    var locals = {
        airVersion: airVersion,
        apis: apis,
        buildIdentifier: sdkGlobals.buildIdentifier,
        hasClientOptions: getAuthMechanisms(apis).includes("SessionTicket"),
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    templatizeTree(locals ,path.resolve(sourceDir, "source"), apiOutputDir);

    for (var a = 0; a < apis.length; a++) {
        makeDatatypes(apis[a], sourceDir, apiOutputDir);
        makeApi(apis[a], sourceDir, apiOutputDir);
    }
}

function removeFilesInDir(dirPath, searchFilter) {
    var files;
    try { files = fs.readdirSync(dirPath); }
    catch (e) { return; }
    if (files.length === 0)
        return;
    for (var i = 0; i < files.length; i++) {
        var filePath = path.resolve(dirPath, files[i]);
        if (fs.statSync(filePath).isFile() && (!searchFilter || filePath.contains(searchFilter)))
            fs.unlinkSync(filePath);
    }
};

function removeExcessFiles(apis, apiOutputDir) {
    for (var a = 0; a < apis.length; a++)
        removeFilesInDir(path.resolve(apiOutputDir, "com/playfab/" + apis[a].name + "Models"), ".as");
}

function getBaseTypeSyntax(datatype) {
    // The model-inheritance feature was removed.
    // However in the future, we may still use some inheritance links for request/result baseclasses, for other sdk features
    if (datatype.isResult)
        return "";
    if (datatype.isRequest)
        return "";
    return "";
}

function makeDatatypes(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.as.ejs"));;
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.as.ejs"));;

    for (var d in api.datatypes) {
        if (!api.datatypes.hasOwnProperty(d))
            continue;

        var eachDatatype = api.datatypes[d];

        var modelLocals = {
            api: api,
            datatype: eachDatatype,
            getBaseTypeSyntax: getBaseTypeSyntax,
            getDeprecationComment: getDeprecationComment,
            getModelPropertyDef: getModelPropertyDef,
            getModelPropertyInit: getModelPropertyInit
        };

        var generatedModel;
        if (eachDatatype.isenum) {
            generatedModel = enumTemplate(modelLocals);
        } else {
            modelLocals.needsPlayFabUtil = needsPlayFabUtil(eachDatatype);
            generatedModel = modelTemplate(modelLocals);
        }

        writeFile(path.resolve(apiOutputDir, "com/playfab/" + api.name + "Models/" + eachDatatype.name + ".as"), generatedModel);
    }
}

// A datatype needs util if it contains a DateTime
function needsPlayFabUtil(datatype) {
    for (var i = 0; i < datatype.properties.length; i++)
        if (datatype.properties[i].actualtype === "DateTime")
            return true;
    return false;
}

function makeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating ActionScript " + api.name + " library to " + apiOutputDir);

    var apiLocals = {
        api: api,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket")
    };

    var apiTemplate = getCompiledTemplate(path.resolve(path.resolve(sourceDir, "templates"), "API.as.ejs"));;
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + api.name + "API.as"), apiTemplate(apiLocals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
}

function getValidPlayFabActionScriptNamespacePrefix(datatype, propName) {

    if (!fullNamespaceRequired(propName))
    {
        return propName;
    }

    var asIndividualNamespaces = datatype.classNameSpace.split('.');

    if (asIndividualNamespaces.length < 2)
    {
        throw new Error("Error in Generating API Model: Namespaces are expected to be in the form playfab.[SDK].[Name]");
    }

    var constructingNamespaceList = [...expectedPlayfabNamespace];

    var remainingNamespace = [];
    for (var i = 1; i < asIndividualNamespaces.length; i++) {
        remainingNamespace.push(asIndividualNamespaces[i]);
    }

    constructingNamespaceList.push(remainingNamespace.join(""));

    constructingNamespaceList.push(propName);

    return constructingNamespaceList.join(".");
}

function fullNamespaceRequired(propName)
{
    return typesThatNeedFullNamespace.indexOf(propName) > -1;
}

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyAsType(property, datatype);

    if (property.collection) {
        if (property.collection === "array")
            return property.name + ":Vector.<" + basicType + ">";
        else if (property.collection === "map")
            return property.name + ":Object"; // Arbitrary maps become Objects here
        else
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    } else {
        if (property.optional && (basicType === "Boolean" || basicType === "int" || basicType === "uint" || basicType === "Number"))
            basicType = "*";
        return property.name + ":" + getValidPlayFabActionScriptNamespacePrefix(datatype, basicType);
    }
}

function getPropertyAsType(property, datatype) {
    if (property.actualtype === "String")
        return "String";
    else if (property.actualtype === "Boolean")
        return "Boolean";
    else if (property.actualtype === "int16")
        return "int";
    else if (property.actualtype === "uint16")
        return "uint";
    else if (property.actualtype === "int32")
        return "int";
    else if (property.actualtype === "uint32")
        return "uint";
    else if (property.actualtype === "int64")
        return "Number";
    else if (property.actualtype === "uint64")
        return "Number";
    else if (property.actualtype === "float")
        return "Number";
    else if (property.actualtype === "double")
        return "Number";
    else if (property.actualtype === "decimal")
        return "Number";
    else if (property.actualtype === "DateTime")
        return "Date";
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return "String";
    else if (property.actualtype === "object")
        return "Object";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getModelPropertyInit(tabbing, property, datatype) {
    if (property.isclass) {
        if (property.collection) {
            if (property.collection === "array")
                return tabbing + "if(data." + property.name + ") { " + property.name + " = new Vector.<" + property.actualtype + ">(); for(var " + property.name + "_iter:int = 0; " + property.name + "_iter < data." + property.name + ".length; " + property.name + "_iter++) { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else if (property.collection === "map")
                return tabbing + "if(data." + property.name + ") { " + property.name + " = {}; for(var " + property.name + "_iter:String in data." + property.name + ") { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else
                throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        } else {
            return tabbing + property.name + " = new " + getValidPlayFabActionScriptNamespacePrefix(datatype, property.actualtype) + "(data." + property.name + ");";
        }
    } else if (property.collection) {
        if (property.collection === "array") {
            var asType = getPropertyAsType(property, datatype);
            return tabbing + property.name + " = data." + property.name + " ? Vector.<" + asType + ">(data." + property.name + ") : null;";
        } else if (property.collection === "map") {
            return tabbing + property.name + " = data." + property.name + ";";
        } else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else if (property.actualtype === "DateTime") {
        return tabbing + property.name + " = PlayFabUtil.parseDate(data." + property.name + ");";
    } else {
        return tabbing + property.name + " = data." + property.name + ";";
    }
}

function getAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    else if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFabSettings.EntityToken";
    else if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings.ClientSessionTicket";
    return "null, null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "var authKey:String = null; var authValue:String = null;\n"
            + tabbing + "if (authKey == null && PlayFabSettings.ClientSessionTicket) { authKey = \"X-Authorization\"; authValue = PlayFabSettings.ClientSessionTicket; }\n"
            + tabbing + "if (authKey == null && PlayFabSettings.DeveloperSecretKey) { authKey = \"X-SecretKey\"; authValue = PlayFabSettings.DeveloperSecretKey; }\n";
    else if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n"
            + tabbing + "if(request.TitleId == null) throw new Error (\"Must be have PlayFabSettings.TitleId set to call this method\");";
    else if (apiCall.auth === "EntityToken")
        return tabbing + "if (PlayFabSettings.EntityToken == null) throw new Error(\"Must call GetEntityToken to call this method\");";
    else if (apiCall.auth === "SessionTicket")
        return tabbing + "if (PlayFabSettings.ClientSessionTicket == null) throw new Error(\"Must be logged in to call this method\");";
    else if (apiCall.auth === "SecretKey")
        return tabbing + "if (PlayFabSettings.DeveloperSecretKey == null) throw new Error (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");";
    return "";
}

function getResultActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket != null ? result.SessionTicket : PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "PlayFabSettings.EntityToken = result.EntityToken != null ? result.EntityToken.EntityToken : PlayFabSettings.EntityToken;\n"
            + tabbing + "MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.result === "RegisterPlayFabUserResult")
        return tabbing + "PlayFabSettings.ClientSessionTicket = result.SessionTicket != null ? result.SessionTicket : PlayFabSettings.ClientSessionTicket;\n"
            + tabbing + "MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "PlayFabSettings.EntityToken = result.EntityToken != null ? result.EntityToken : PlayFabSettings.EntityToken;\n";
    else if (apiCall.url === "/Client/AttributeInstall")
        return tabbing + "// Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + tabbing + "PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    return "";
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "[Deprecated(message=\"The " + apiObj.name + " API and its associated datatypes are scheduled for deprecation. Use " + apiObj.deprecation.ReplacedBy + " instead.\", replacement=\"" + apiObj.deprecation.ReplacedBy + "\")]\n";
    else if (isDeprecated)
        return tabbing + "[Deprecated(message=\"The " + apiObj.name + " API and its associated datatypes are scheduled for deprecation.\")]\n";
    return "";
}

// Basically, deprecating fields and models causes tons of deprecation warnings against ourself,
//   making it nearly impossible to display to the user when THEY are using deprecated fields.
function getDeprecationComment(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "// Deprecated, please use " + apiObj.deprecation.ReplacedBy + "\n";
    else if (isDeprecated)
        return tabbing + "// Deprecated\n";
    return "";
}
