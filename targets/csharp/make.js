var path = require("path");

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
    GenerateNugetTemplate(sourceDir, apiOutputDir);
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
    var modelTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Model.cs.ejs"));
    var modelsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Models.cs.ejs"));
    var enumTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Enum.cs.ejs"));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {
            api: api,
            datatype: datatype,
            GetModelPropertyDef: GetModelPropertyDef,
            GetPropertyAttribs: GetPropertyAttribs,
            GetBaseTypeSyntax: GetBaseTypeSyntax,
            GetDeprecationAttribute: GetDeprecationAttribute
        };
        
        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };
    
    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {
            api: apis[a],
            makeDatatype: makeDatatype
        };
        
        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + apis[a].name + "Models.cs"), modelsTemplate(modelsLocal));
    }
}

function MakeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    
    var apiLocals = {
        api: api,
        GetAuthParams: GetAuthParams,
        GetRequestActions: GetRequestActions,
        GetResultActions: GetResultActions,
        GetDeprecationAttribute: GetDeprecationAttribute,
        GenerateApiSummary: GenerateApiSummary,
        authKey: api.name === "Client"
    };
    
    var apiTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/API.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), apiTemplate(apiLocals));
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;
    
    var errorsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Errors.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), errorsTemplate(errorLocals));
    
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
    
    var utilTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabUtil.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabUtil.cs"), utilTemplate(settingsLocals));
    
    var settingsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.cs.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabSettings.cs"), settingsTemplate(settingsLocals));
}

function GenerateProject(apis, sourceDir, apiOutputDir, libname, extraDefines) {
    var projLocals = {
        apis: apis,
        libname: libname,
        extraDefines: ";NETFX_CORE;SIMPLE_JSON_TYPEINFO" + extraDefines,
    };
    
    var vcProjTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), vcProjTemplate(projLocals));
}

function GenerateNugetTemplate(sourceDir, apiOutputDir) {
    var projLocals = {
        sdkVersion: exports.sdkVersion,
        sdkDate: exports.sdkVersion.split(".")[2],
        sdkYear: exports.sdkVersion.split(".")[2].substr(0, 2)
    };
    
    var vcProjTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSDK.nuspec.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.nuspec"), vcProjTemplate(projLocals));
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

function GenerateApiSummary(tabbing, element, summaryParam) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    return tabbing + "/// <summary>\n" 
        + tabbing + "/// " + element[summaryParam] + "\n" 
        + tabbing + "/// </summary>\n";
}
