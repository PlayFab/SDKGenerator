var path = require('path');

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp client SDK to " + apiOutputDir);
    
    var libname = "Client";

    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    makeDatatypes([api], sourceDir, apiOutputDir);
    makeAPI(api, sourceDir, apiOutputDir);
    generateErrors(api, sourceDir, apiOutputDir);
    generateVersion(api, sourceDir, apiOutputDir);
    generateProject([api], sourceDir, apiOutputDir, libname);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp server SDK to " + apiOutputDir);
    
    var libname = "Server";
    
    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    generateErrors(apis[0], sourceDir, apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating C-sharp combined SDK to " + apiOutputDir);
    
    var libname = "All";

    copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
    copyTree(path.resolve(sourceDir, 'UnittestRunner'), path.resolve(apiOutputDir, 'UnittestRunner')); // Copy the actual unittest project in the CombinedAPI
    copyFile(path.resolve(sourceDir, 'build+unit.bat'), path.resolve(apiOutputDir, 'build+unit.bat'));
    copyFile(path.resolve(sourceDir, 'PlayFabSDK+Unit.sln'), path.resolve(apiOutputDir, 'PlayFabSDK+Unit.sln'));
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var i in apis) {
        var api = apis[i];
        makeAPI(api, sourceDir, apiOutputDir);
    }
    generateErrors(apis[0], sourceDir, apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);
    generateProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeTests = function (testData, apiLookup, sourceDir, testOutputLocation) {
    var templateDir = path.resolve(sourceDir, "templates");
    var testsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Tests.cs.ejs")));
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
    if (typeof action == 'string') {
        action = action.trim().toLowerCase();
        if (action == 'clearcache')
            return "ClearServerCache();";
        else if (action == 'wait')
            return "Wait();";
        else if (action == 'reset')
            return "ResetServer();";
        else if (action == 'abort')
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
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
    var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cs.ejs")));
    var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
    
    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = getModelPropertyDef;
        modelLocals.getPropertyAttribs = getPropertyAttribs;
        modelLocals.getDescriptionClean = getDescriptionClean;
        modelLocals.getModelAccessibility = getModelAccessibility;
        modelLocals.joinParams = joinParams;
        modelLocals.true = true;
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
        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "Models.cs"), generatedModels);
    }
}

function makeAPI(api, sourceDir, apiOutputDir) {
    console.log("Generating C# " + api.name + " library to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cs.ejs")));

    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getReturnAction = getReturnAction;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.joinParamsForCall = joinParamsForCall;
    apiLocals.getReturnComment = getReturnComment;
    apiLocals.getParamsCommentForCall = getParamsCommentForCall;
    apiLocals.getCallReturnsData = getCallReturnsData;
    apiLocals.getCallRequestsData = getCallRequestsData;
    apiLocals.getReturnType = getReturnType;
    apiLocals.getDescriptionClean = getDescriptionClean;
    apiLocals.authKey = api.name == "Client";
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

function generateErrors(api, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), generatedErrors);
}

function generateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cs.ejs")));
    var versionLocals = {};
    versionLocals.apiRevision = api.revision;
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "source/PlayFabVersion.cs"), generatedVersion);
}

function generateProject(apis, sourceDir, apiOutputDir, libname) {
    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs")));
    
    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;
    
    var generatedProject = vcProjTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), generatedProject);
}

function joinParamsForCall(api, apiCall, withTypes, asParam, optionalLast) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.request)
        {
            return joinParams(datatype, withTypes, asParam, optionalLast);
        }
    }

    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function joinParams(datatype, withTypes, asParam, optionalLast) {
    var result = "";

    var properties = [];
    if(optionalLast) {
        for(var i in datatype.properties) {
            var property = datatype.properties[i];
            if(!property.optional)
                properties.push(property)
        }
        for(var i in datatype.properties) {
            var property = datatype.properties[i];
            if(property.optional)
                properties.push(property)
        }
    }
    else {
        properties = datatype.properties;
    }

    for(var i in properties) {
        var property = properties[i];

        if(result.length > 0)
            result = result + ", ";

        if(withTypes)
            result = result + getModelPropertyDefType(property, datatype) + " ";

        if(asParam)
            result = result + "in" + property.name;
        else
            result = result + property.name;

        if(optionalLast && property.optional)
            result = result + " = null";
    }

    return result;
}

function getModelPropertyDefType(property, datatype) {
    if (property.collection) {
        var basicType = getPropertyCSType(property, datatype, false);
        
        if (property.collection == 'array') {
            return 'List<' + basicType + '>';
        }
        else if (property.collection == 'map') {
            return 'Dictionary<string, ' + basicType + '>';
        }
        else {
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
        }
    }
    else {
        return getPropertyCSType(property, datatype, true);
    }
}

function getModelPropertyDef(property, datatype) {
    return getModelPropertyDefType(property, datatype) + " " + property.name;
}

function getModelAccessibility(datatype) {
    if(datatype.properties.length < 2 && datatype.name.endsWith("Response"))
        return "internal";
    else
        return "public";
}

function getDescriptionClean(description) {
    while(description.indexOf("<") >= 0)
        description = description.replace("<", "&lt;");

    while(description.indexOf(">") >= 0)
        description = description.replace(">", "&gt;");

    return description;
}

function getPropertyAttribs(property, datatype, api) {
    var attribs = "";
    
    var optionalHandled = false;
    if (property.isenum) {
        if (property.collection) {
            if(property.optional)
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

    if(!optionalHandled && !property.optional)
        attribs += "[JsonProperty(Required = Required.Always)]\n\t\t";
    
    return attribs;
}

function getPropertyCSType(property, datatype, needOptional) {
    var optional = (needOptional && property.optional) ? '?' : '';
    
    if (property.actualtype == 'String') {
        return 'string';
    }
    else if (property.actualtype == 'Boolean') {
        return 'bool' + optional;
    }
    else if (property.actualtype == 'int16') {
        return 'short' + optional;
    }
    else if (property.actualtype == 'uint16') {
        return 'ushort' + optional;
    }
    else if (property.actualtype == 'int32') {
        return 'int' + optional;
    }
    else if (property.actualtype == 'uint32') {
        return 'uint' + optional;
    }
    else if (property.actualtype == 'int64') {
        return 'long' + optional;
    }
    else if (property.actualtype == 'uint64') {
        return 'ulong' + optional;
    }
    else if (property.actualtype == 'float') {
        return 'float' + optional;
    }
    else if (property.actualtype == 'double') {
        return 'double' + optional;
    }
    else if (property.actualtype == 'DateTime') {
        return 'DateTime' + optional;
    }
    else if (property.isclass) {
        return property.actualtype;
    }
    else if (property.isenum) {
        return property.actualtype + optional;
    }
    else if (property.actualtype == 'object') {
        return 'object';
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

function getAuthParams(apiCall) {
    if (apiCall.auth == 'SecretKey')
        return "\"X-SecretKey\", Settings.DeveloperSecretKey";
    else if (apiCall.auth == 'SessionTicket')
        return "\"X-Authorization\", AuthKey";
    return "null, null";
}

function getReturnType(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.result) {
            if(datatype.properties.length == 0)
                return "Task";
            else if(datatype.properties.length == 1)
                return "Task<" + getModelPropertyDefType(datatype.properties[0], datatype) + ">";
            else
                return "Task<" + apiCall.result + ">";
        }
    }

    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function getCallReturnsData(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.result) {
            if(datatype.properties.length == 0)
                return false;
            else
                return true;
        }
    }

    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function getCallRequestsData(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.request) {
            if(datatype.properties.length == 0)
                return false;
            else
                return true;
        }
    }

    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function getParamsCommentForCall(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.request)
        {
            return getParamsComment(datatype);
        }
    }

    throw "Couldn't find the data type for: " + apiCall.request + " in " + api.name;
}

function getParamsComment(datatype) {
    var result = "";

    var properties = [];
    for(var i in datatype.properties) {
        var property = datatype.properties[i];
        if(!property.optional)
            properties.push(property)
    }
    for(var i in datatype.properties) {
        var property = datatype.properties[i];
        if(property.optional)
            properties.push(property)
    }

    for(var i in properties) {
        var property = properties[i];

        var optText = "";
        if(property.optional)
        {
            optText = "Optional: ";
        }
        if(property.description)
        {
            result = result + "\n\t\t/// <param name=\"in" + property.name + "\">" + optText + getDescriptionClean(property.description) + "</param>";
        }
    }

    return result;
    }

function getReturnComment(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.result) {
            if(datatype.properties.length == 0)
                return "\n\t\t/// <returns>No results</returns>";
            else if(datatype.properties.length == 1 && datatype.properties[0].description)
                return "\n\t\t/// <returns>" + getDescriptionClean(datatype.properties[0].description) + "</returns>";
            else
                return "";
        }
    }

    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function getRequestActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
        return "request.TitleId = Settings.TitleId ?? request.TitleId;\n\t\t\tif(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
    if (api.name == "Client" && apiCall.auth == 'SessionTicket')
        return "if (AuthKey == null) throw new Exception (\"Must be logged in to call this method\");\n"
    if (apiCall.auth == 'SecretKey')
        return "if (Settings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n"
    return "";
}

function getResultActions(apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
        return "AuthKey = result.SessionTicket ?? AuthKey;\n";
    else if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
        return "Settings.LogicServerURL = result.Url;\n";
    return "";
}

function getReturnAction(apiCall, api) {
    for(var i in api.datatypes) {
        var datatype = api.datatypes[i];
        if(datatype.name === apiCall.result) {
            if(datatype.properties.length == 0)
                return "";
            else if(datatype.properties.length == 1)
                return "return result." + datatype.properties[0].name + ";";
            else
                return "return result;";
        }
    }

    throw "Couldn't find the data type for: " + apiCall.result + " in " + api.name;
}

function getUrlAccessor(apiCall) {
    if (apiCall.serverType == 'logic')
        return "Settings.GetLogicURL()";
    return "Settings.GetURL()";
}
