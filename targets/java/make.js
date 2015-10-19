var path = require('path');

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating Java client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, 'src/'), apiOutputDir);
    
    makeDatatypes([api], sourceDir, apiOutputDir);
    
    makeAPI(api, sourceDir, apiOutputDir);
    
    generateErrors(api, sourceDir, apiOutputDir);
    generateVersion(api, sourceDir, apiOutputDir);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, 'src/'), apiOutputDir);
    
    makeDatatypes(apis, sourceDir, apiOutputDir);
    
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    
    generateErrors(apis[0], sourceDir, apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, 'src/'), apiOutputDir);
    
    makeDatatypes(apis, sourceDir, apiOutputDir);
    
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    
    generateErrors(apis[0], sourceDir, apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
    
    // Copy testing files
    copyFile(path.resolve(sourceDir, 'testingfiles/PlayFabApiTest.java'), path.resolve(apiOutputDir, 'src/PlayFabApiTest.java'));
    copyFile(path.resolve(sourceDir, 'testingfiles/RunPfTests.bat'), path.resolve(apiOutputDir, 'src/RunPfTests.bat'));
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
        var api = apis[a];
        
        var modelsLocal = {};
        modelsLocal.api = api;
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "src/playfab/PlayFab" + api.name + "Models.java"), generatedModels);
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
    apiLocals.authKey = api.name == "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "src/playfab/PlayFab" + api.name + "API.java"), generatedApi);
}

function generateErrors(api, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.java.ejs")));
    
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "src/playfab/PlayFabErrors.java"), generatedErrors);
}

function generateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.java.ejs")));
    
    var versionLocals = {};
    versionLocals.apiRevision = api.revision;
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "src/playfab/internal/PlayFabVersion.java"), generatedVersion);
}

function getModelPropertyDef(property, datatype) {
    if (property.collection) {
        var basicType = getPropertyJavaType(property, datatype, false);
        
        if (property.collection == 'array') {
            return 'ArrayList<' + basicType + '> ' + property.name;
        }
        else if (property.collection == 'map') {
            return 'Map<String,' + basicType + '> ' + property.name;
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else {
        var basicType = getPropertyJavaType(property, datatype, true);
        return basicType + ' ' + property.name;
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
    var optional = '';
    
    if (property.actualtype == 'String') {
        return 'String';
    }
    else if (property.actualtype == 'Boolean') {
        return 'Boolean' + optional;
    }
    else if (property.actualtype == 'int16') {
        return 'Short' + optional;
    }
    else if (property.actualtype == 'uint16') {
        return 'Integer' + optional;
    }
    else if (property.actualtype == 'int32') {
        return 'Integer' + optional;
    }
    else if (property.actualtype == 'uint32') {
        return 'Long' + optional;
    }
    else if (property.actualtype == 'int64') {
        return 'Long' + optional;
    }
    else if (property.actualtype == 'uint64') {
        return 'Long' + optional;
    }
    else if (property.actualtype == 'float') {
        return 'Float' + optional;
    }
    else if (property.actualtype == 'double') {
        return 'Double' + optional;
    }
    else if (property.actualtype == 'DateTime') {
        return 'Date' + optional;
    }
    else if (property.isclass) {
        return property.actualtype;
    }
    else if (property.isenum) {
        return property.actualtype + optional;
    }
    else if (property.actualtype == "object") {
        return 'Object';
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}


function getAuthParams(apiCall) {
    if (apiCall.auth == 'SecretKey')
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth == 'SessionTicket')
        return "\"X-Authorization\", AuthKey";
    
    return "null, null";
}


function getRequestActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
        return "request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n\t\t\tif(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name == "Client" && apiCall.auth == 'SessionTicket')
        return "if (AuthKey == null) throw new Exception (\"Must be logged in to call this method\");\n"
    if (apiCall.auth == 'SecretKey')
        return "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n"
    return "";
}

function getResultActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
        return "AuthKey = result.SessionTicket != null ? result.SessionTicket : AuthKey;\n";
    else if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
        return "PlayFabSettings.LogicServerURL = result.Url;\n";
    return "";
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType == 'logic')
        return "PlayFabSettings.GetLogicURL()";
    
    return "PlayFabSettings.GetURL()";
}


