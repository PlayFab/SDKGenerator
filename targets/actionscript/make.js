var path = require("path");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating ActionScript3 combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    for (var i = 0; i < apis.length; i++) {
        makeDatatypes(apis[i], sourceDir, apiOutputDir);
        makeAPI(apis[i], sourceDir, apiOutputDir);
    }
    
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
}

function getBaseTypeSyntax(datatype) {
    // The model-inheritance feature was removed.
    // However in the future, we may still use some inheritance links for request/result baseclasses, for other sdk features
    return "";
}

function makeDatatypes(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.as.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.as.ejs")));
    
    for (var d in api.datatypes) {
        var datatype = api.datatypes[d];
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyInit = getModelPropertyInit;
        modelLocals.getBaseTypeSyntax = getBaseTypeSyntax;
        
        var generatedModel;
        if (datatype.isenum) {
            generatedModel = enumTemplate(modelLocals);
        }
        else {
            modelLocals.needsPlayFabUtil = needsPlayFabUtil(datatype);
            generatedModel = modelTemplate(modelLocals);
        }
        
        writeFile(path.resolve(apiOutputDir, "com/playfab/" + api.name + "Models/" + datatype.name + ".as"), generatedModel);
    }
}

// A datatype needs util if it contains a DateTime
function needsPlayFabUtil(datatype) {
    for (var i in datatype.properties)
        if (datatype.properties[i].actualtype === "DateTime")
            return true;
    return false;
}

function makeAPI(api, sourceDir, apiOutputDir) {
    console.log("Generating ActionScript " + api.name + " library to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.as.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.hasClientOptions = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + api.name + "API.as"), generatedApi);
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
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

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyASType(property, datatype);
    
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

function getPropertyASType(property, datatype) {
    
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

function getModelPropertyInit(property, datatype) {
    if (property.isclass) {
        if (property.collection) {
            if (property.collection === "array")
                return "if(data." + property.name + ") { " + property.name + " = new Vector.<" + property.actualtype + ">(); for(var " + property.name + "_iter:int = 0; " + property.name + "_iter < data." + property.name + ".length; " + property.name + "_iter++) { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else if (property.collection === "map")
                return "if(data." + property.name + ") { " + property.name + " = {}; for(var " + property.name + "_iter:String in data." + property.name + ") { " + property.name + "[" + property.name + "_iter] = new " + property.actualtype + "(data." + property.name + "[" + property.name + "_iter]); }}";
            else
                throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
        else {
            return property.name + " = new " + property.actualtype + "(data." + property.name + ");";
        }
    }
    else if (property.collection) {
        if (property.collection === "array") {
            var asType = getPropertyASType(property, datatype);
            return property.name + " = data." + property.name + " ? Vector.<" + asType + ">(data." + property.name + ") : null;";
        }
        else if (property.collection === "map") {
            return property.name + " = data." + property.name + ";";
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else if (property.actualtype === "DateTime") {
        return property.name + " = PlayFabUtil.parseDate(data." + property.name + ");";
    }
    else {
        return property.name + " = data." + property.name + ";";
    }
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", authKey";
    return "null, null";
}

function getRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "            request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n" 
            + "            if(request.TitleId == null) throw new Error (\"Must be have PlayFabSettings.TitleId set to call this method\");";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "            if (authKey == null) throw new Error(\"Must be logged in to call this method\");";
    if (apiCall.auth === "SecretKey")
        return "            if (PlayFabSettings.DeveloperSecretKey == null) throw new Error (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");";
    return "";
}

function getResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "                    authKey = result.SessionTicket != null ? result.SessionTicket : authKey;\n" 
            + "                    MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "                    // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + "                    PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "                    PlayFabSettings.LogicServerURL = result.Url;\n";
    return "";
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings.GetLogicURL()";
    return "PlayFabSettings.GetURL()";
}
