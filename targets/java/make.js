var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["src", "../AndroidStudioExample/app/src/main/java"];
    var libOutputLoc = ["src", "../AndroidStudioExample/app/libs"];
    
    for (var i = 0; i < srcOutputLoc.length; i++) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        var libOutputDir = path.resolve(apiOutputDir, libOutputLoc[i]);
        var isAndroid = srcOutputDir.indexOf("AndroidStudioExample") >= 0;
        
        console.log("Generating Java client SDK to " + srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcCode"), srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcLibs"), libOutputDir);
        MakeDatatypes([api], sourceDir, srcOutputDir);
        MakeApi(api, sourceDir, srcOutputDir, isAndroid);
        GenerateSimpleFiles([api], sourceDir, srcOutputDir, isAndroid);
    }
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "src");
    console.log("Generating Java server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "srcLibs"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.resolve(apiOutputDir, "src");
    console.log("Generating Java combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "srcLibs"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
    
    // Copy testing files
    copyFile(path.resolve(sourceDir, "testingFiles/PlayFabApiTest.java"), path.resolve(apiOutputDir, "PlayFabApiTest.java"));
    copyFile(path.resolve(sourceDir, "testingFiles/RunPfTests.bat"), path.resolve(apiOutputDir, "RunPfTests.bat"));
}

function MakeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = GetCompiledTemplate(path.resolve(templateDir, "Model.java.ejs"));
    var modelsTemplate = GetCompiledTemplate(path.resolve(templateDir, "Models.java.ejs"));
    var enumTemplate = GetCompiledTemplate(path.resolve(templateDir, "Enum.java.ejs"));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = GetModelPropertyDef;
        modelLocals.GetPropertyAttribs = GetPropertyAttribs;
        modelLocals.GenerateSummary = GenerateSummary;
        modelLocals.api = api;
        return datatype.isenum ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };
    
    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + apis[a].name + "Models.java"), generatedModels);
    }
}

function MakeApi(api, sourceDir, apiOutputDir, isAndroid) {
    console.log("Generating Java " + api.name + " library to " + apiOutputDir);
    
    var apiTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/API.java.ejs"));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.isAndroid = isAndroid;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.GenerateSummary = GenerateSummary;
    apiLocals.hasClientOptions = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFab" + api.name + "API.java"), generatedApi);
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir, isAndroid) {
    var errorsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Errors.java.ejs"));
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabErrors.java"), generatedErrors);
    
    var settingsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.java.ejs"));
    var settingsLocals = {};
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    settingsLocals.isAndroid = isAndroid;
    settingsLocals.hasClientOptions = false;
    settingsLocals.hasServerOptions = false;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    var generatedSettings = settingsTemplate(settingsLocals);
    writeFile(path.resolve(apiOutputDir, "com/playfab/PlayFabSettings.java"), generatedSettings);
}

function GetModelPropertyDef(property, datatype) {
    var basicType = GetPropertyJavaType(property, datatype);
    if (property.collection && property.collection === "array")
        return "ArrayList<" + basicType + "> " + property.name;
    else if (property.collection && property.collection === "map")
        return "Map<String," + basicType + "> " + property.name;
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    
    return GetPropertyJavaType(property, datatype) + " " + property.name;
}

function GetPropertyAttribs(tabbing, property, datatype, api) {
    var attribs = "";
    
    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += tabbing + "@Unordered(\"" + listDatatype.sortKey + "\")\n";
        else
            attribs += tabbing + "@Unordered\n";
    }
    
    return attribs;
}

function GetPropertyJavaType(property, datatype) {
    var optional = "";
    
    if (property.actualtype === "String")
        return "String";
    else if (property.actualtype === "Boolean")
        return "Boolean" + optional;
    else if (property.actualtype === "int16")
        return "Short" + optional;
    else if (property.actualtype === "uint16")
        return "Integer" + optional;
    else if (property.actualtype === "int32")
        return "Integer" + optional;
    else if (property.actualtype === "uint32")
        return "Long" + optional;
    else if (property.actualtype === "int64")
        return "Long" + optional;
    else if (property.actualtype === "uint64")
        return "Long" + optional;
    else if (property.actualtype === "float")
        return "Float" + optional;
    else if (property.actualtype === "double")
        return "Double" + optional;
    else if (property.actualtype === "DateTime")
        return "Date" + optional;
    else if (property.isclass)
        return property.actualtype;
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "Object";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", _authKey";
    return "null, null";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "        request.TitleId = PlayFabSettings.TitleId != null ? PlayFabSettings.TitleId : request.TitleId;\n        if(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "        if (_authKey == null) throw new Exception (\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "        if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "        _authKey = result.SessionTicket != null ? result.SessionTicket : _authKey;\n" 
            + "        MultiStepClientLogin(resultData.data.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "        // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "        PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    return "";
}

function GetUrlAccessor(apiCall) {
    return "PlayFabSettings.GetURL()";
}

// In Java, the summary and the deprecation are not distinct, so we need a single function that generates both
function GenerateSummary(tabbing, apiObj, summaryParam) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var hasSummary = apiObj.hasOwnProperty(summaryParam);
    
    if (!isDeprecated && !hasSummary) {
        return "";
    }
    
    var summaryLine = "";
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        summaryLine = tabbing + " * @deprecated Please use " + apiObj.deprecation.ReplacedBy + " instead. \n";
    else if (isDeprecated)
        summaryLine = tabbing + " * @deprecated Do not use\n";
    else if (hasSummary)
        summaryLine = tabbing + " * " + apiObj[summaryParam].replaceAll(">", "&GT;") + "\n";

    return tabbing + "/**\n" 
        + summaryLine
        + tabbing + " */\n"
        + (isDeprecated ? tabbing + "@Deprecated\n" : "");
}
