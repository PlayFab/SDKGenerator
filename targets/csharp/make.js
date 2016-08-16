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
    for (var i = 0; i < apis.length; i++) {
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
    copyFile(path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis)
        makeAPI(apis[i], sourceDir, apiOutputDir);
    generateSimpleFiles(apis, sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, "All");
}

function getBaseTypeSyntax(datatype) {
    if ((datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1) && datatype.sortKey)
        return " : PlayFabResultCommon" + ", IComparable<" + datatype.name + ">";
    if (datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1)
        return " : PlayFabResultCommon";
    if (datatype.sortKey)
        return " : IComparable<" + datatype.name + ">";
    return "";
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var modelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Model.cs.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Models.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Enum.cs.ejs")));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyAttribs = getPropertyAttribs;
        modelLocals.getBaseTypeSyntax = getBaseTypeSyntax;
        
        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };
    
    for (var a = 0; a < apis.length; a++) {
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
    
    var settingsLocals = {};
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    
    var utilTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtil.cs.ejs")));
    var generatedTemplate = utilTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabUtil.cs"), generatedTemplate);

    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs")));
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
        return "            PlayFabSettings.LogicServerUrl = result.Url;\n";
    return "";
}
