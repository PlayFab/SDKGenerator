var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    var srcOutputLoc = ["", "../AndroidStudioExample/app/"];
    var testOutputLoc = ["", "../AndroidStudioExample/app/"];
    
    for (var i = 0; i < srcOutputLoc.length; i++) {
        var srcOutputDir = path.resolve(apiOutputDir, srcOutputLoc[i]);
        var testOutputDir = path.resolve(apiOutputDir, testOutputLoc[i]);
        var isAndroid = srcOutputDir.indexOf("AndroidStudioExample") >= 0;
        
        console.log("Generating Java client SDK to " + srcOutputDir);
        copyTree(path.resolve(sourceDir, "srcCode"), srcOutputDir);
        copyTree(path.resolve(sourceDir, "testingFiles/client"), testOutputDir);
        MakeDatatypes(apis, sourceDir, srcOutputDir);
        for (var j = 0; j < apis.length; j++)
            makeApi(apis[j], sourceDir, apiOutputDir, false);
        GenerateSimpleFiles(apis, "Client", sourceDir, srcOutputDir, isAndroid);
    }
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "testingFiles/server"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, "Server", sourceDir, apiOutputDir);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Java combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "srcCode"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "testingFiles/combo"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir, false);
    GenerateSimpleFiles(apis, "Combo", sourceDir, apiOutputDir);
}

function MakeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.java.ejs"));
    var modelsTemplate = getCompiledTemplate(path.resolve(templateDir, "Models.java.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.java.ejs"));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = GetModelPropertyDef;
        modelLocals.GetPropertyAttribs = GetPropertyAttribs;
        modelLocals.generateApiSummary = generateApiSummary;
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

function makeApi(api, sourceDir, apiOutputDir, isAndroid) {
    console.log("Generating Java " + api.name + " library to " + apiOutputDir);
    
    var apiLocals = {
        api: api,
        isAndroid: isAndroid,
        GetAuthParams: GetAuthParams,
        GetRequestActions: GetRequestActions,
        GetResultActions: GetResultActions,
        GetUrlAccessor: GetUrlAccessor,
        generateApiSummary: generateApiSummary,
        hasClientOptions: api.name === "Client"
    };
    
    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.java.ejs"));
    writeFile(path.resolve(apiOutputDir, "src/main/java/com/playfab/PlayFab" + api.name + "API.java"), apiTemplate(apiLocals));
}

function GenerateSimpleFiles(apis, apiName, sourceDir, apiOutputDir, isAndroid) {
    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.java.ejs"));
    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.java.ejs"));
    var pomTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/pom.xml.ejs"));
    
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

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines, false, "@deprecated");

    // FILTERING: Java is very picky about the output
    if (lines)
        for (var i = 0; i < lines.length; i++)
            lines[i] = lines[i].replaceAll("<", "&lt;").replaceAll(">", "&gt;");

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/** " + lines[0] + " */\n";
    } else if (lines.length > 1) {
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else {
        output = "";
    }

    // TODO: The deprecation attribute should be a separate GetDeprecationAttribute call like various other SDKS
    if (apiElement.hasOwnProperty("deprecation"))
        output += tabbing + "@Deprecated\n";

    return output;
}
