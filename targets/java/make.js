var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["src", "../AndroidStudioExample/app/src/main/java"];
    var libOutputLoc = ["src", "../AndroidStudioExample/app/libs"];
    
    for (var i in srcOutputLoc) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        var libOutputDir = path.resolve(apiOutputDir, libOutputLoc[i]);
        
        console.log("Generating Java client SDK to " + srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcCode"), srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcLibs"), libOutputDir);
        makeDatatypes([api], sourceDir, srcOutputDir);
        makeAPI(api, sourceDir, srcOutputDir);
        generateSimpleFiles([api], sourceDir, srcOutputDir);
    }
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "src");
    console.log("Generating Java server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "srcLibs"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis)
        makeAPI(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "src");
    console.log("Generating Java combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "srcLibs"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis)
        makeAPI(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    
    // Copy testing files
    copyFile(path.resolve(sourceDir, "testingfiles/PlayFabApiTest.java"), path.resolve(apiOutputDir, "PlayFabApiTest.java"));
    copyFile(path.resolve(sourceDir, "testingfiles/RunPfTests.bat"), path.resolve(apiOutputDir, "RunPfTests.bat"));
}

function getJsonString(input) {
    if (!input)
        return "{}";
    var json = JSON.stringify(input);
    return escapeForString(json);
}

function escapeForString(input) {
    input = input.replace(new RegExp('\\\\', "g"), '\\\\');
    input = input.replace(new RegExp('\"', "g"), '\\"');
    return input;
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.java.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.java.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.java.ejs")));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyAttribs = getPropertyAttribs;
        modelLocals.api = api;
        
        var generatedModel = null;
        
        if (datatype.isenum) {
            generatedModel = enumTemplate(modelLocals);
        }
        else {
            generatedModel = modelTemplate(modelLocals);
        }
        
        return generatedModel;
    };
    
    for (var a in apis) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + apis[a].name + "Models.java"), generatedModels);
    }
}

function makeAPI(api, sourceDir, apiOutputDir) {
    console.log("Generating Java " + api.name + " library to " + apiOutputDir);
    
    
    var templateDir = path.resolve(sourceDir, "templates");
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.java.ejs")));
    
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.authKey = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + api.name + "API.java"), generatedApi);
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.java.ejs")));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabErrors.java"), generatedErrors);
    
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.java.ejs")));
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/internal/PlayFabVersion.java"), generatedVersion);
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.java.ejs")));
    var settingsLocals = {};
    settingsLocals.hasClientOptions = false;
    settingsLocals.hasServerOptions = false;
    for (var i in apis) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabSettings.java"), generatedSettings);
}

function getModelPropertyDef(property, datatype) {
    if (property.collection) {
        var basicType = getPropertyJavaType(property, datatype, false);
        
        if (property.collection === "array") {
            return "ArrayList<" + basicType + "> " + property.name;
        }
        else if (property.collection === "map") {
            return "Map<String," + basicType + "> " + property.name;
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else {
        var basicType = getPropertyJavaType(property, datatype, true);
        return basicType + " " + property.name;
    }
}

function getPropertyAttribs(property, datatype, api) {
    var attribs = "";
    
    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "@Unordered(\"" + listDatatype.sortKey + "\")\n\t\t";
        else
            attribs += "@Unordered\n\t\t";
    }
    
    return attribs;
}


function getPropertyJavaType(property, datatype, needOptional) {
    var optional = "";
    
    if (property.actualtype === "String") {
        return "String";
    }
    else if (property.actualtype === "Boolean") {
        return "Boolean" + optional;
    }
    else if (property.actualtype === "int16") {
        return "Short" + optional;
    }
    else if (property.actualtype === "uint16") {
        return "Integer" + optional;
    }
    else if (property.actualtype === "int32") {
        return "Integer" + optional;
    }
    else if (property.actualtype === "uint32") {
        return "Long" + optional;
    }
    else if (property.actualtype === "int64") {
        return "Long" + optional;
    }
    else if (property.actualtype === "uint64") {
        return "Long" + optional;
    }
    else if (property.actualtype === "float") {
        return "Float" + optional;
    }
    else if (property.actualtype === "double") {
        return "Double" + optional;
    }
    else if (property.actualtype === "DateTime") {
        return "Date" + optional;
    }
    else if (property.isclass) {
        return property.actualtype;
    }
    else if (property.isenum) {
        return property.actualtype + optional;
    }
    else if (property.actualtype === "object") {
        return "Object";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}


function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", AuthKey";
    
    return "null, null";
}


function getRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n\t\t\tif(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "if (AuthKey == null) throw new Exception (\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}

function getResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "AuthKey = result.SessionTicket != null ? result.SessionTicket : AuthKey;\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "PlayFabSettings.LogicServerURL = result.Url;\n";
    return "";
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings.GetLogicURL()";
    
    return "PlayFabSettings.GetURL()";
}


