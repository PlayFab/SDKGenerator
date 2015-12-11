var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes([api], sourceDir, apiOutputDir);
    makeAPI(api, sourceDir, apiOutputDir);
    generateSimpleFiles([api], sourceDir, apiOutputDir);
    generateProject([api], sourceDir, apiOutputDir, "Client");
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "Server");
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "UnittestRunner")); // Copy the actual unittest project in the CombinedAPI
    copyFile(path.resolve(sourceDir, "build+unit.bat"), path.resolve(apiOutputDir, "build+unit.bat"));
    copyFile(path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis)
        makeAPI(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "All");
}

exports.makeTests = function (testData, apiLookup, sourceDir, testOutputLocation) {
    var testsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Tests.cs.ejs")));
    var testsLocals = {};
    testsLocals.testData = testData;
    testsLocals.apiLookup = apiLookup;
    testsLocals.getJsonString = getJsonString;
    testsLocals.escapeForString = escapeForString;
    testsLocals.makeTestInstruction = makeTestInstruction;
    var generatedTests = testsTemplate(testsLocals);
    writeFile(testOutputLocation, generatedTests);
}

function makeTestInstruction(action) {
    if (typeof action === "string") {
        action = action.trim().toLowerCase();
        if (action === "clearcache")
            return "ClearServerCache();";
        else if (action === "wait")
            return "Wait();";
        else if (action === "reset")
            return "ResetServer();";
        else if (action === "abort")
            return "return;";
        throw "Unknown test action " + action;
    }
    
    return action.name + "();";
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
    var modelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Model.cs.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Models.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Enum.cs.ejs")));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyAttribs = getPropertyAttribs;
        modelLocals.api = api;
        
        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };
    
    for (var a in apis) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + apis[a].name + "Models.cs"), generatedModels);
    }
}

function makeAPI(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/API.cs.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.authKey = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), generatedApi);
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), generatedErrors);
    
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cs.ejs")));
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabVersion.cs"), generatedVersion);
    
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs")));
    var settingsLocals = {};
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    for (var i in apis) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabSettings.cs"), generatedSettings);
}

function generateProject(apis, sourceDir, apiOutputDir, libname) {
    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs")));
    
    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;
    
    var generatedProject = vcProjTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), generatedProject);
}

function getModelPropertyDef(property, datatype) {
    var basicType;
    if (property.collection) {
        basicType = getPropertyCSType(property, datatype, false);
        
        if (property.collection === "array")
            return "List<" + basicType + "> " + property.name;
        else if (property.collection === "map")
            return "Dictionary<string," + basicType + "> " + property.name;
        else
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    }
    else {
        basicType = getPropertyCSType(property, datatype, true);
        return basicType + " " + property.name;
    }
}

function getPropertyAttribs(property, datatype, api) {
    var attribs = "";
    
    if (property.isenum) {
        if (property.collection)
            attribs += "[JsonProperty(ItemConverterType = typeof(StringEnumConverter))]\n        ";
        else
            attribs += "[JsonConverter(typeof(StringEnumConverter))]\n        ";
    }
    
    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "[Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n        ";
        else
            attribs += "[Unordered]\n        ";
    }
    
    return attribs;
}

function getPropertyCSType(property, datatype, needOptional) {
    var optional = (needOptional && property.optional) ? "?" : "";
    
    if (property.actualtype === "String")
        return "string";
    else if (property.actualtype === "Boolean")
        return "bool" + optional;
    else if (property.actualtype === "int16")
        return "short" + optional;
    else if (property.actualtype === "uint16")
        return "ushort" + optional;
    else if (property.actualtype === "int32")
        return "int" + optional;
    else if (property.actualtype === "uint32")
        return "uint" + optional;
    else if (property.actualtype === "int64")
        return "long" + optional;
    else if (property.actualtype === "uint64")
        return "ulong" + optional;
    else if (property.actualtype === "float")
        return "float" + optional;
    else if (property.actualtype === "double")
        return "double" + optional;
    else if (property.actualtype === "DateTime")
        return "DateTime" + optional;
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "object";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", _authKey";
    return "null, null";
}

function getRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "            request.TitleId = PlayFabSettings.TitleId ?? request.TitleId;\n" 
            + "            if(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "            if (_authKey == null) throw new Exception (\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "            if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}

function getResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "            _authKey = result.SessionTicket ?? _authKey;\n"
            + "            await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "            // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + "            PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "            PlayFabSettings.LogicServerURL = result.Url;\n";
    return "";
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "PlayFabSettings.GetLogicURL()";
    return "PlayFabSettings.GetURL()";
}
