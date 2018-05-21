var path = require("path");

// generate.js is our central file, for all generated sdks.  Don't modify that one.
// For each function below, apiOutputDir is automatically set to include a subfolder, so each make function generates to a different subfolder.
// You can over-ride this by uncommenting this:
// exports.putInRoot = true;
// BEWARE, you should only implement 1 function if you use this option, or manually define your subfolders in your make functions

// generate.js looks for some specific exported functions in make.js, like:
exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    // Builds the client api.  The provided "api" variable is a single object, the API_SPECS/client.api.json as an object
    
    console.log("\n\nGenerating Client api from: " + sourceDir + " to: " + apiOutputDir+"\n");
    //copyTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is
    MakeSharedFile(sourceDir, apiOutputDir);
    MakeDatatypes([api], sourceDir, apiOutputDir);
    MakeAPI(api, sourceDir, apiOutputDir);
    //GenerateSimpleFiles([api], sourceDir, apiOutputDir); 
}

// generate.js looks for some specific exported functions in make.js, like:
exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    // Builds the server api.  The provided "apis" variable is a list of objects, built from: API_SPECS/admin.api.json, API_SPECS/matchmaker.api.json, and API_SPECS/server.api.json
    // If you don't want admin, you should filter it out (we may remove admin in the future, once we finish the "makeAdminAPI" option
    
    console.log("Generating Server api from: " + sourceDir + " to: " + apiOutputDir);
    //copyTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is
    MakeSharedFile(sourceDir, apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);
    for(let i=0;i<apis.length;i++) {
        MakeAPI(apis[i], sourceDir, apiOutputDir);
    }
}

// generate.js looks for some specific exported functions in make.js, like:
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    // Builds every api.  The provided "apis" variable is a list of objects, built from: API_SPECS/admin.api.json, API_SPECS/matchmaker.api.json, API_SPECS/server.api.json, and API_SPECS/client.api.json
    
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);
    //copyTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is
    MakeSharedFile(sourceDir, apiOutputDir);
    MakeDatatypes(apis, sourceDir, apiOutputDir);

    for(let i=0;i<apis.length;i++) {
        MakeAPI(apis[i], sourceDir, apiOutputDir);
    }
}

function MakeDatatypes(apis, sourceDir, apiOutputDir) { 
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = GetCompiledTemplate(path.resolve(templateDir, "Model.go.ejs"));
    var modelsTemplate = GetCompiledTemplate(path.resolve(templateDir, "Models.go.ejs"));
    var enumTemplate = GetCompiledTemplate(path.resolve(templateDir, "Enum.go.ejs"));

    console.log("Making datatypes\n")

    var makeDatatype = function (datatype, api) {
        var modelLocals = {};
        modelLocals.datatype = datatype;
        modelLocals.getPropertyDef = GetModelPropertyDef;
        //modelLocals.getPropertyAttribs = GetPropertyAttribs;
        modelLocals.generateSummary = GenerateSummary;
        modelLocals.api = api;
        return datatype.isenum ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };


    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {};
        modelsLocal.api = apis[a];
        modelsLocal.makeDatatype = makeDatatype;
        var generatedModels = modelsTemplate(modelsLocal);
        console.log(apis[a].name);
        var apiName = apis[a].name;
        var pathStr = path.resolve(apiOutputDir, "playfab/"+apiName.toLowerCase()+"/models/PlayFab" + apiName + "Models.go");
        console.log("Writing out api datatypes to " + pathStr)
        writeFile(pathStr, generatedModels);
    }
}

function MakeAPI(api, sourceDir, apiOutputDir) {
    console.log("Generating Go " + api.name + " library to " + apiOutputDir);
    
    var apiTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/API.go.ejs"));
    var apiLocals = {};
    apiLocals.api = api;

    apiLocals.getAuthParamName = GetAuthParamName;
    apiLocals.getRequestActions = GetRequestActions;
    apiLocals.getResultActions = GetResultActions;
    //apiLocals.GetUrlAccessor = GetUrlAccessor;
    apiLocals.generateSummary = GenerateSummary;
    apiLocals.hasClientOptions = (api.name === "Client");
    var generatedApi = apiTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "playfab/"+api.name.toLowerCase()+"/PlayFab" + api.name + "API.go"), generatedApi);
}

function MakeSharedFile(sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var sharedTemplate = GetCompiledTemplate(path.resolve(templateDir, "pfshared.go.ejs"));

    var sharedLocals = {}
    sharedLocals.sdkVersion = exports.sdkVersion;
    sharedLocals.buildIdentifier = exports.buildIdentifier
    var compiledSharedFile = sharedTemplate(sharedLocals);
    writeFile(path.resolve(apiOutputDir, "playfab/pfshared/pfshared.go"), compiledSharedFile);
}


function GetModelPropertyDef(property, datatype) {

    if(property.collection)
    {
        switch(property.collection) 
        {
            case "array": return  property.name+" []"+GetPropertyGoType(property, datatype);
            case "map": return property.name + " map[string]"+GetPropertyGoType(property, datatype);
            default: throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
            break;
        }
    }
    else 
    {
        return property.name + " "  + GetPropertyGoType(property, datatype);
    }
}

function GetPropertyGoType(property, datatype) {

    if(property.isclass)
    {
        return property.actualtype;
    }
    else if(property.isenum)
    {
        return property.actualtype;
    }

    switch(property.actualtype) {
        case "String": return "string";
        case "Boolean": return "bool";
        case "int16": return property.actualtype;
        case "uint16": return property.actualtype;
        case "int32": return property.actualtype;
        case "uint32": return property.actualtype;
        case "int64": return property.actualtype;
        case "uint64": return property.actualtype;
        case "float": return "float32";
        case "double": return "float64"
        case "DateTime": return "time.Time"
        case "object": return "interface{}";
        default:  throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
        break;
    }

    return 
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "if pfshared.PlayFabSettings.TitleId != \"\" {\n"
        +"            request.TitleId = pfshared.PlayFabSettings.TitleId;\n"
        +"        }\n"
        +"        if request.TitleId == \"\" {\n"
        +"            return nil, errors.New(\"Must be have pfshared.PlayFabSettings.TitleId set to call this method\");\n"
        +"        }";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return "if pfshared.PlayFabSettings.SessionTicket == \"\" {\n"
        +"            errors.New(\"Must be logged in to call this method\");\n"
        +"        }";
    if (apiCall.auth === "SecretKey")
        return "if pfshared.PlayFabSettings.DeveloperSecretKey == \"\" {\n"
            + "           errors.New(\"Must have pfshared.PlayFabSettings.DeveloperSecretKey set to call this method\");\n"
            +"        }";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "if typedRespObj.Data.SessionTicket != \"\"{\n" 
            +"            pfshared.PlayFabSettings.SessionTicket = typedRespObj.Data.SessionTicket\n"
            +"        }\n"
            + "        MultiStepClientLogin(typedRespObj.Data.SettingsForUser.NeedsAttribution);";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "// Modify AdvertisingIDType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + "        pfshared.PlayFabSettings.AdvertisingIDType += \"_Successful\";";
    return "";
}

function GetAuthParamName(apiCall) {
    switch(apiCall.auth) {
        case "SecretKey": return "\"X-SecretKey\"";
        case "SessionTicket": return "\"X-Authorization\"";
        default: return "\"\""
    }
}

function GenerateSummary(tabbing, apiObj, summaryParam) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var hasSummary = apiObj.hasOwnProperty(summaryParam);
    
    if (!isDeprecated && !hasSummary) {
        return "";
    }
    
    var summaryLine = "";
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return "//Deprecated: Please use " + apiObj.deprecation.ReplacedBy + " instead.";
    else if (isDeprecated)
        return "//Deprecated Do not use";
    else if (hasSummary)
        return "//" + apiObj[summaryParam];

    return summaryLine;

}
