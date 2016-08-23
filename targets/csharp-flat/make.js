var path = require("path");
var ejs = require("ejs");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp client SDK to " + apiOutputDir);
    
    var libname = "Client";
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeAllDatatypes([api], sourceDir, apiOutputDir);
    MakeApi(api, sourceDir, apiOutputDir);
    GenerateErrors(api, sourceDir, apiOutputDir);
    GenerateVersion(api, sourceDir, apiOutputDir);
    GenerateProject([api], sourceDir, apiOutputDir, libname);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp server SDK to " + apiOutputDir);
    
    var libname = "Server";
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeAllDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        MakeApi(api, sourceDir, apiOutputDir);
    }
    GenerateErrors(apis[0], sourceDir, apiOutputDir);
    GenerateVersion(apis[0], sourceDir, apiOutputDir);
    GenerateProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);
    
    var libname = "All";
    
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "UnittestRunner")); // Copy the actual unittest project in the CombinedAPI
    copyFile(path.resolve(sourceDir, "PlayFabSDK+Unit.sln"), path.resolve(apiOutputDir, "PlayFabSDK+Unit.sln"));
    MakeAllDatatypes(apis, sourceDir, apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        MakeApi(api, sourceDir, apiOutputDir);
    }
    GenerateErrors(apis[0], sourceDir, apiOutputDir);
    GenerateVersion(apis[0], sourceDir, apiOutputDir);
    GenerateProject(apis, sourceDir, apiOutputDir, libname);
}

function MakeAllDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cs.ejs")));
    
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];
        var modelsLocal = {};
        modelsLocal.api = api;
        modelsLocal.sourceDir = sourceDir;
        modelsLocal.MakeDatatype = MakeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "Models.cs"), generatedModels);
    }
}

function MakeDatatype(datatype, api, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
    
    var modelLocals = {};
    modelLocals.datatype = datatype;
    modelLocals.getPropertyDef = GetModelPropertyDef;
    modelLocals.GetPropertyAttribs = GetPropertyAttribs;
    modelLocals.GetDescriptionClean = GetDescriptionClean;
    modelLocals.GetModelAccessibility = GetModelAccessibility;
    modelLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    modelLocals.JoinParams = JoinParams;
    modelLocals.true = true;
    modelLocals.api = api;
    
    if (datatype.isenum)
        return enumTemplate(modelLocals);
    return modelTemplate(modelLocals);
};

function MakeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cs.ejs")));
    
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.GetAuthParams = GetAuthParams;
    apiLocals.GetRequestActions = GetRequestActions;
    apiLocals.GetResultActions = GetResultActions;
    apiLocals.GetReturnAction = GetReturnAction;
    apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.JoinParamsForCall = JoinParamsForCall;
    apiLocals.GetReturnComment = GetReturnComment;
    apiLocals.GetParamsCommentForCall = GetParamsCommentForCall;
    apiLocals.GetCallReturnsData = GetCallReturnsData;
    apiLocals.GetCallRequestsData = GetCallRequestsData;
    apiLocals.GetReturnType = GetReturnType;
    apiLocals.GetDescriptionClean = GetDescriptionClean;
    apiLocals.GetDeprecationAttribute = GetDeprecationAttribute;
    apiLocals.authKey = api.name === "Client";
    apiLocals.hasServerOptions = false;
    apiLocals.hasClientOptions = false;
    apiLocals.isAdmin = false;
    if (api.name === "Client")
        apiLocals.hasClientOptions = true;
    else
        apiLocals.hasServerOptions = true;
    if (api.name === "Admin")
        apiLocals.isAdmin = true;
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.cs"), generatedApi);
}

function GenerateErrors(api, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), generatedErrors);
}

function GenerateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cs.ejs")));
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    versionLocals.buildIdentifier = exports.buildIdentifier;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabVersion.cs"), generatedVersion);
}

function GenerateProject(apis, sourceDir, apiOutputDir, libname) {
    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs")));
    
    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;
    
    var generatedProject = vcProjTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), generatedProject);
}

function JoinParamsForCall(api, apiCall, withTypes, asParam, optionalLast) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.request) {
            return JoinParams(datatype, withTypes, asParam, optionalLast);
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function JoinParams(datatype, withTypes, asParam, optionalLast) {
    var result = "";
    
    var properties = [];
    if (optionalLast) {
        for (var a = 0; a < datatype.properties.length; a++) {
            var property1 = datatype.properties[a];
            if (!property1.optional)
                properties.push(property1);
        }
        for (var b = 0; b < datatype.properties.length; b++) {
            var property2 = datatype.properties[b];
            if (property2.optional)
                properties.push(property2);
        }
    }
    else {
        properties = datatype.properties;
    }
    
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        
        if (result.length > 0)
            result = result + ", ";
        
        if (withTypes)
            result = result + GetModelPropertyDefType(property, datatype) + " ";
        
        if (asParam)
            result = result + "in" + property.name;
        else
            result = result + property.name;
        
        if (optionalLast && property.optional)
            result = result + " = null";
    }
    
    return result;
}

function GetModelPropertyDefType(property, datatype) {
    if (property.collection) {
        var basicType = GetPropertyCsType(property, datatype, false);
        
        if (property.collection === "array") {
            return "List<" + basicType + ">";
        }
        else if (property.collection === "map") {
            return "Dictionary<string, " + basicType + ">";
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else {
        return GetPropertyCsType(property, datatype, true);
    }
}

function GetModelPropertyDef(property, datatype) {
    return GetModelPropertyDefType(property, datatype) + " " + property.name;
}

function GetModelAccessibility(datatype) {
    if (datatype.properties.length < 2 && datatype.name.endsWith("Response"))
        return "internal";
    else
        return "public";
}

function GetDescriptionClean(description) {
    while (description.indexOf("<") >= 0)
        description = description.replace("<", "&lt;");
    
    while (description.indexOf(">") >= 0)
        description = description.replace(">", "&gt;");
    
    return description;
}

function GetPropertyAttribs(property, datatype, api) {
    var attribs = "";
    
    var optionalHandled = false;
    if (property.isenum) {
        if (property.collection) {
            if (property.optional)
                attribs += "[JsonProperty(ItemConverterType = typeof(StringEnumConverter))]\n\t\t";
            else
                attribs += "[JsonProperty(Required = Required.Always, ItemConverterType = typeof(StringEnumConverter))]\n\t\t";
            
            optionalHandled = true;
        }
        else
            attribs += "[JsonConverter(typeof(StringEnumConverter))]\n\t\t";
    }
    
    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "[Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n\t\t";
        else
            attribs += "[Unordered]\n\t\t";
    }
    
    if (!optionalHandled && !property.optional)
        attribs += "[JsonProperty(Required = Required.Always)]\n\t\t";
    
    return attribs;
}

function GetPropertyCsType(property, datatype, needOptional) {
    var optional = (needOptional && property.optional) ? "?" : "";
    
    if (property.actualtype === "String") {
        return "string";
    }
    else if (property.actualtype === "Boolean") {
        return "bool" + optional;
    }
    else if (property.actualtype === "int16") {
        return "short" + optional;
    }
    else if (property.actualtype === "uint16") {
        return "ushort" + optional;
    }
    else if (property.actualtype === "int32") {
        return "int" + optional;
    }
    else if (property.actualtype === "uint32") {
        return "uint" + optional;
    }
    else if (property.actualtype === "int64") {
        return "long" + optional;
    }
    else if (property.actualtype === "uint64") {
        return "ulong" + optional;
    }
    else if (property.actualtype === "float") {
        return "float" + optional;
    }
    else if (property.actualtype === "double") {
        return "double" + optional;
    }
    else if (property.actualtype === "DateTime") {
        return "DateTime" + optional;
    }
    else if (property.isclass) {
        return property.actualtype;
    }
    else if (property.isenum) {
        return property.actualtype + optional;
    }
    else if (property.actualtype === "object") {
        return "object";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", Settings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", _authKey";
    return "null, null";
}

function GetReturnType(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.result) {
            if (datatype.properties.length === 0)
                return "Task";
            else if (datatype.properties.length === 1)
                return "Task<" + GetModelPropertyDefType(datatype.properties[0], datatype) + ">";
            else
                return "Task<" + apiCall.result + ">";
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function GetCallReturnsData(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.result) {
            if (datatype.properties.length === 0)
                return false;
            else
                return true;
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function GetCallRequestsData(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.request) {
            if (datatype.properties.length === 0)
                return false;
            else
                return true;
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function GetParamsCommentForCall(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.request) {
            return GetParamsComment(datatype);
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function GetParamsComment(datatype) {
    var result = "";
    
    var properties = [];
    for (var a = 0; a < datatype.properties.length; a++) {
        var property1 = datatype.properties[a];
        if (!property1.optional)
            properties.push(property1);
    }
    for (var b = 0; b < datatype.properties.length; b++) {
        var property2 = datatype.properties[b];
        if (property2.optional)
            properties.push(property2);
    }
    
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        
        var optText = "";
        if (property.optional)
            optText = "Optional: ";
    }
    if (property.description) {
        result = result + "\n\t\t/// <param name=\"in" + property.name + "\">" + optText + GetDescriptionClean(property.description) + "</param>";
    }
    return result;
}

function GetReturnComment(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.result) {
            if (datatype.properties.length === 0)
                return "\n\t\t/// <returns>No results</returns>";
            else if (datatype.properties.length === 1 && datatype.properties[0].description)
                return "\n\t\t/// <returns>" + GetDescriptionClean(datatype.properties[0].description) + "</returns>";
            else
                return "";
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "            request.TitleId = Settings.TitleId ?? request.TitleId;\n\t\t\tif(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name === "Client" && (apiCall.name === "AttributeInstall"))
        return "            if (_authKey == null) throw new Exception (\"Must be logged in to call this method\");\n" +
                "            if (string.IsNullOrEmpty(request.Android_Id) && string.IsNullOrEmpty(request.Idfa))\n" +
                "            {\n" +
                "                if (Settings.AdvertisingIdType == PlayFabDefaultSettings.AD_TYPE_ANDROID_ID)\n" +
                "                    request.Android_Id = Settings.AdvertisingIdValue;\n" +
                "                if (Settings.AdvertisingIdType == PlayFabDefaultSettings.AD_TYPE_IDFA)\n" +
                "                    request.Idfa = Settings.AdvertisingIdValue;\n" +
                "            }\n";
    if (apiCall.auth === "SecretKey")
        return "            if (Settings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "            if (_authKey == null) throw new Exception (\"Must be logged in to call this method\");\n";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "            _authKey = result.SessionTicket ?? _authKey;\n            await MultiStepClientLogin(result.SettingsForUser.NeedsAttribution);\n";
    if (api.name === "Client" && (apiCall.name === "AttributeInstall"))
        return "            Settings.AdvertisingIdType += \"_Successful\";\n";
    else if (api.name === "Client" && apiCall.result === "GetCloudScriptUrlResult")
        return "            Settings.LogicServerURL = result.Url;\n";
    return "";
}

function GetReturnAction(apiCall, api) {
    for (var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if (datatype.name === apiCall.result) {
            if (datatype.properties.length === 0)
                return "";
            else if (datatype.properties.length === 1)
                return "            return result." + datatype.properties[0].name + ";\n";
            else
                return "            return result;\n";
        }
    }
    
    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function GetUrlAccessor(apiCall) {
    if (apiCall.serverType === "logic")
        return "Settings.GetLogicURL()";
    return "Settings.GetURL()";
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
