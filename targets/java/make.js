var path = require("path");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["", "../AndroidStudioExample/app/"];
    var testOutputLoc = ["", "../AndroidStudioExample/app/"];
    
    for (var i = 0; i < srcOutputLoc.length; i++) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        var testOutputDir = path.resolve(apiOutputDir, testOutputLoc[i]);
        var isAndroid = srcOutputDir.indexOf("AndroidStudioExample") >= 0;
        
        console.log("Generating Java client SDK to " + srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcCode"), srcOutputDir);
        copyTree(path.resolve(sourceDir, "testingFiles/client"), testOutputDir);
        MakeDatatypes([api], sourceDir, srcOutputDir);
        MakeApi(api, sourceDir, srcOutputDir, isAndroid);
        GenerateSimpleFiles([api], "Client", sourceDir, srcOutputDir, isAndroid);
    }
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "testingFiles/server"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, "Server", sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "testingFiles/combo"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, "Combo", sourceDir, apiOutputDir);
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
        var modelsLocal = {
            api: apis[a],
            makeDatatype: makeDatatype
        };
        writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + apis[a].name + "Models.java"), modelsTemplate(modelsLocal));
    }
}

function MakeApi(api, sourceDir, apiOutputDir, isAndroid) {
    console.log("Generating Java " + api.name + " library to " + apiOutputDir);
    
    var apiLocals = {
        api: api,
        isAndroid: isAndroid,
        GetAuthParams: GetAuthParams,
        GetRequestActions: GetRequestActions,
        GetResultActions: GetResultActions,
        GetUrlAccessor: GetUrlAccessor,
        GenerateSummary: GenerateSummary,
        hasClientOptions: api.name === "Client"
    };
    
    var apiTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/API.java.ejs"));
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + api.name + "API.java"), apiTemplate(apiLocals));
}

function GenerateSimpleFiles(apis, apiName, sourceDir, apiOutputDir, isAndroid) {
    var errorsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Errors.java.ejs"));
    var settingsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.java.ejs"));
    var pomTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/pom.xml.ejs"));
    
    var errorLocals = {
        errorList: apis[0].errorList,
        errors: apis[0].errors
    };
    
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFabErrors.java"), errorsTemplate(errorLocals));
    
    var settingsLocals = {
        sdkVersion: exports.sdkVersion,
        buildIdentifier: exports.buildIdentifier,
        isAndroid: isAndroid,
        hasClientOptions: false,
        hasServerOptions: false
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFabSettings.java"), settingsTemplate(settingsLocals));
    
    if (!isAndroid) {
        var pomLocals = {
            apiName: apiName,
            apiNameLc: apiName.toLowerCase(),
            sdkVersion: exports.sdkVersion
        };
        writeFile(path.resolve(apiOutputDir, "pom.xml"), pomTemplate(pomLocals));
    }
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
function GenerateSummary(tabbing, apiObj, summaryParam, extraLines) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var hasSummary = apiObj.hasOwnProperty(summaryParam);
    
    if (!isDeprecated && !hasSummary) {
        return "";
    }
    
    var summaryLine = "";
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        summaryLine = "@deprecated Please use " + apiObj.deprecation.ReplacedBy + " instead.";
    else if (isDeprecated)
        summaryLine = "@deprecated Do not use";
    else if (hasSummary)
        summaryLine = apiObj[summaryParam].replaceAll("<", "&lt;").replaceAll(">", "&gt;").trim();
    
    var output = tabbing + "/**\n";
    if (summaryLine)
        output += tabbing + " * " + summaryLine + "\n";
    if ((typeof extraLines) === "string")
        output += tabbing + " * " + extraLines + "\n";
    else if (extraLines)
        for (var i = 0; i < extraLines.length; i++)
            output += tabbing + " * " + extraLines[i] + "\n";
    output += tabbing + " */\n";
    if (isDeprecated)
        output += tabbing + "@Deprecated\n";
    return output;
}
