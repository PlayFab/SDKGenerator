var path = require("path");
var ejs = require("ejs");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp client SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeDatatypes([api], sourceDir, apiOutputDir);
    MakeApi(api, sourceDir, apiOutputDir);
    GenerateSimpleFiles([api], sourceDir, apiOutputDir);
    GenerateProject([api], sourceDir, apiOutputDir, "Client", "");
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp server SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        MakeApi(api, sourceDir, apiOutputDir);
    }
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
    GenerateProject(apis, sourceDir, apiOutputDir, "Server", ";DISABLE_PLAYFABCLIENT_API");
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "UnittestRunner")); // Copy the actual unittest project in the CombinedAPI
    copyFile(path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir);
    GenerateProject(apis, sourceDir, apiOutputDir, "All", "");
}

function GetBaseTypeSyntax(datatype) {
    var parents = [];
    
    if (datatype.className.toLowerCase().endsWith("request"))
        parents.push("PlayFabRequestCommon");
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        parents.push("PlayFabResultCommon");
    if (datatype.sortKey)
        parents.push("IComparable<" + datatype.name + ">");
    
    var output = "";
    if (parents.length > 0) {
        output = " : ";
        for (var i = 0; i < parents.length; i++) {
            if (i !== 0)
                output += ", ";
            output += parents[i];
        }
    }
    return output;
}

function MakeDatatypes(apis, sourceDir, apiOutputDir) {
    var modelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Model.cs.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Models.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Enum.cs.ejs")));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatype = datatype;
        modelLocals.GetModelPropertyDef = GetModelPropertyDef;
        modelLocals.GetPropertyAttribs = GetPropertyAttribs;
        modelLocals.GetBaseTypeSyntax = GetBaseTypeSyntax;
        modelLocals.GetDeprecationAttribute = GetDeprecationAttribute;
        
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

function MakeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    
    var apiTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/API.cs.ejs")));
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    apiLocals.GenerateSummary = GenerateSummary;
    
    apiLocals.authKey = api.name === "Client";
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), generatedApi);
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir) {
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

function GenerateProject(apis, sourceDir, apiOutputDir, libname, extraDefines) {
    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs")));
    
    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;
    projLocals.extraDefines = ";NETFX_CORE;SIMPLE_JSON_TYPEINFO" + extraDefines;
    
    var generatedProject = vcProjTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), generatedProject);
}

function GetModelPropertyDef(property, datatype) {
    var basicType;
    if (property.collection) {
        basicType = GetPropertyCsType(property, datatype, false);
        
        if (property.collection === "array")
            return "List<" + basicType + "> " + property.name;
        else if (property.collection === "map")
            return "Dictionary<string," + basicType + "> " + property.name;
        else
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    }
    else {
        basicType = GetPropertyCsType(property, datatype, true);
        return basicType + " " + property.name;
    }
}

function GetPropertyAttribs(property, datatype, api) {
    var attribs = "";
    
    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "[Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n        ";
        else
            attribs += "[Unordered]\n        ";
    }
    
    return attribs;
}

function GetPropertyCsType(property, datatype, needOptional) {
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

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", _authKey";
    return "null, null";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "            request.TitleId = PlayFabSettings.TitleId ?? request.TitleId;\n" 
            + "            if(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "            if (_authKey == null) throw new Exception (\"Must be logged in to call this method\");\n";
    if (apiCall.auth === "SecretKey")
        return "            if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "            _authKey = result.SessionTicket ?? _authKey;\n" 
            + "            await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "            // Modify AdvertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "            PlayFabSettings.AdvertisingIdType += \"_Successful\";\n";
    return "";
}

function GetDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true": "false";
    
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "[Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n";
    else if (isDeprecated)
        return tabbing + "[Obsolete(\"No longer available\", " + isError + ")]\n";
    return "";
}

function GenerateSummary(tabbing, element, summaryParam) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    return tabbing + "/// <summary>\n" 
        + tabbing + "/// " + element[summaryParam] + "\n" 
        + tabbing + "/// </summary>\n";
}
