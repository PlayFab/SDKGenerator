var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating ActionScript3 combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++) {
        MakeDatatypes(apis[i], sourceDir, apiOutputDir);
        MakeApi(apis[i], sourceDir, apiOutputDir);
    }
    
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
}

function GetBaseTypeSyntax(datatype) {
    // The model-inheritance feature was removed.
    // However in the future, we may still use some inheritance links for request/result baseclasses, for other sdk features
    return "";
}

function MakeDatatypes(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.as.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.as.ejs")));
    
    for (var d in api.datatypes) {
        var datatype = api.datatypes[d];
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatype = datatype;
        modelLocals.GetModelPropertyDef = GetModelPropertyDef;
        modelLocals.GetModelPropertyInit = GetModelPropertyInit;
        modelLocals.GetBaseTypeSyntax = GetBaseTypeSyntax;
        modelLocals.GetDeprecationComment = GetDeprecationComment;
        
        var generatedModel;
        if (datatype.isenum) {
            generatedModel = enumTemplate(modelLocals);
        } else {
            modelLocals.NeedsPlayFabUtil = NeedsPlayFabUtil(datatype);
            generatedModel = modelTemplate(modelLocals);
        }
        
        writeFile(path.resolve(apiOutputDir, "com/playfab/" + api.name + "Models/" + datatype.name + ".as"), generatedModel);
    }
}

// A datatype needs util if it contains a DateTime
function NeedsPlayFabUtil(datatype) {
    for (var i = 0; i < datatype.properties.length; i++)
        if (datatype.properties[i].actualtype === "DateTime")
            return true;
    return false;
}

function MakeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating ActionScript " + api.name + " library to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.as.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    apiLocals.hasClientOptions = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + api.name + "API.as"), generatedApi);
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.as.ejs")));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabError.as"), generatedErrors);
    
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.as.ejs")));
    var versionLocals = {};
    versionLocals.sdkVersion = exports.sdkVersion;
    versionLocals.buildIdentifier = exports.buildIdentifier;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabVersion.as"), generatedVersion);
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.as.ejs")));
    var settingsLocals = {};
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedsettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabSettings.as"), generatedsettings);
}

function GetModelPropertyDef(property, datatype) {
    var basicType = GetPropertyAsType(property, datatype);
    
    if (property.collection) {
        if (property.collection === "array") {
            return property.name + ":Vector.<" + basicType + ">";
        }
        else if (property.collection === "map") {
            return property.name + ":Object";
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else {
        if (property.optional && (basicType === "Boolean" 
            || basicType === "int" 
            || basicType === "uint" 
            || basicType === "Number"))
            basicType = "*";
        return property.name + ":" + basicType;
    }
}

function GetPropertyAsType(property, datatype) {
    
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

function GetModelPropertyInit(tabbing, property, datatype) {
    if (property.isclass) {
        if (property.collection) {
            if (property.collection === "array")
                return tabbing + "if(data." + property.name + ") { " + property.name + " = new Vector.<" + property.actualtype + ">(); for(var " + property.name + "_iter:int = 0; " + property.name + "_iter < data." + property.name + ".length; " + property.name + "_iter++) { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else if (property.collection === "map")
                return tabbing + "if(data." + property.name + ") { " + property.name + " = {}; for(var " + property.name + "_iter:String in data." + property.name + ") { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else
                throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
        else {
            return tabbing + property.name + " = new " + property.actualtype + "(data." + property.name + ");";
        }
    }
    else if (property.collection) {
        if (property.collection === "array") {
            var asType = GetPropertyAsType(property, datatype);
            return tabbing + property.name + " = data." + property.name + " ? Vector.<" + asType + ">(data." + property.name + ") : null;";
        }
        else if (property.collection === "map") {
            return tabbing + property.name + " = data." + property.name + ";";
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else if (property.actualtype === "DateTime") {
        return tabbing + property.name + " = PlayFabUtil.parseDate(data." + property.name + ");";
    }
    else {
        return tabbing + property.name + " = data." + property.name + ";";
    }
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", authKey";
    return "null, null";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "            request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n" 
            + "            if(request.TitleId == null) throw new Error (\"Must be have PlayFabSettings.TitleId set to call this method\");";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "            if (authKey == null) throw new Error(\"Must be logged in to call this method\");";
    if (apiCall.auth === "SecretKey")
        return "            if (PlayFabSettings.DeveloperSecretKey == null) throw new Error (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "                    authKey = result.SessionTicket != null ? result.SessionTicket : authKey;\n" 
            + "                    MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "                    // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "                    PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    return "";
}

function GetUrlAccessor(apiCall) {
    return "PlayFabSettings.GetURL()";
}

function GetDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "[Deprecated(message=\"The " + apiObj.name + " API and its associated datatypes are scheduled for deprecation. Use " + apiObj.deprecation.ReplacedBy + " instead.\", replacement=\"" + apiObj.deprecation.ReplacedBy + "\")]\n";
    else if (isDeprecated)
        return tabbing + "[Deprecated(message=\"The " + apiObj.name + " API and its associated datatypes are scheduled for deprecation.\")]\n";
    return "";
}

// Basically, deprecating fields and models causes tons of deprecation warnings against ourself,
//   making it nearly impossible to display to the user when THEY are using deprecated fields.
function GetDeprecationComment(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "// Deprecated, please use " + apiObj.deprecation.ReplacedBy + "\n";
    else if (isDeprecated)
        return tabbing + "// Deprecated\n";
    return "";
}
