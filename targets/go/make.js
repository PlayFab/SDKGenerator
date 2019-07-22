var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "sdk");
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);

    var locals = {
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    makeDatatypes(apis, sourceDir, apiOutputDir);
    for (var a = 0; a < apis.length; a++) {
        outputPath = path.join(apiOutputDir, apis[a].name.toLowerCase())
        makeApi(apis[a], sourceDir, outputPath);
    }
}

function makeApi(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        sdkVersion: sdkGlobals.sdkVersion,
        generateApiSummary: generateApiSummary,
        getAuthInputParams: getAuthInputParams,
        getCurlAuthParams: getCurlAuthParams,
        getCustomApiSignatures: getCustomApiSignatures,
        getRequestActions: getRequestActions,
        sourceDir: sourceDir,
        getVerticalNameDefault: getVerticalNameDefault
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Api.go.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.go"), apiTemplate(locals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "";
}

function getCurlAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", entityToken";
    if (apiCall.auth === "SessionTicket")
        return "\"X-Authentication\", clientSessionTicket";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", developerSecretKey";
    return "\"\", \"\"";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "    " + "var authKey, authValue string\n    if entityToken != \"\" { \n " + "    " + "   authKey = \"X-EntityToken\" \n " + "    " + "   authValue = entityToken \n" + "    } "
            + "else if clientSessionTicket != \"\" { \n " + "    " + "   authKey = \"X-Authentication\" \n " + "    " + "   authValue = clientSessionTicket \n" + "    } "
            + "else if developerSecretKey != \"\" { \n " + "    " + "   authKey = \"X-SecretKey\" \n " + "    " + "   authValue = developerSecretKey \n " + "   }\n";
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return "    if postData != nil && postData.TitleId == \"\" { \n " + "    " + "   postData.TitleId = settings.TitleId \n" + "    }\n";
    if (apiCall.result === "AttributeInstallResult")
        return "    " + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
        + "    " + "settings.AdvertisingIdType = settings.AdvertisingIdType + \"_Successful\"\n"
        + "    " + "if clientSessionTicket == \"\" {\n        return nil, playfab.NewCustomError(\"clientSessionTicket should not be an empty string\", playfab.ErrorGeneric)\n    }";
    if (apiCall.auth === "EntityToken")
        return "    " + "if entityToken == \"\" {\n        return nil, playfab.NewCustomError(\"entityToken should not be an empty string\", playfab.ErrorGeneric)\n    }";
    if (apiCall.auth === "SessionTicket")
        return "    " + "if clientSessionTicket == \"\" {\n        return nil, playfab.NewCustomError(\"clientSessionTicket should not be an empty string\", playfab.ErrorGeneric)\n    }";
    if (apiCall.auth === "SecretKey")
        return "    " + "if developerSecretKey == \"\" {\n        return nil, playfab.NewCustomError(\"developerSecretKey should not be an empty string\", playfab.ErrorGeneric)\n    }";
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);
    lines[0] = "// " + apiElement.name + " " + lowercaseFirstLetter(lines[0])
    output = lines.join("\n" + "// ") + "\n"
    return output;
}

function lowercaseFirstLetter(string) {
    return string ? string.charAt(0).toLowerCase() + string.slice(1) : "";
}

function getAuthInputParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "entityToken string, clientSessionTicket string, developerSecretKey string";
    if (apiCall.auth === "EntityToken")
        return "entityToken string";
    if (apiCall.auth === "SessionTicket")
        return "clientSessionTicket string";
    if (apiCall.auth === "SecretKey")
        return "developerSecretKey string";
    return "";
}

function getCustomApiSignatures(api, sourceDir, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken") {
        var locals = {
            api: api,
            apiCall: apiCall,
            generateApiSummary: generateApiSummary,
            getAuthInputParams: getAuthInputParams,
            getCurlAuthParams: getCurlAuthParams,
            getRequestActions: getRequestActions,
        };
        var customTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/GetEntityTokenExtra.go.ejs"));
        return customTemplate(locals);
    }
    return "";
}

function makeDatatypes(apis, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var modelTemplate = getCompiledTemplate(path.resolve(templateDir, "Model.go.ejs"));
    var modelsTemplate = getCompiledTemplate(path.resolve(templateDir, "Models.go.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(templateDir, "Enum.go.ejs"));

    var makeDatatype = function (datatype, api) {
        var locals = {
            api: api,
            datatype: datatype,
            getPropertyDef: getModelPropertyDef,
            generateApiSummary: generateApiSummary
        };
        return datatype.isenum ? enumTemplate(locals) : modelTemplate(locals);
    };

    for (var a = 0; a < apis.length; a++) {
        var locals = {
            api: apis[a],
            makeDatatype: makeDatatype
        };
        writeFile(path.resolve(apiOutputDir, apis[a].name.toLowerCase(), "PlayFab" + apis[a].name + "Models.go"), modelsTemplate(locals));
    }
}

function getModelPropertyDef(property, datatype) {
    var basicType = getPropertyGoType(property, datatype);
    if (property.collection && property.collection === "array")
        return capitalizeFirstLetter(property.name) + " []" + basicType + " `json:\""+property.name+",omitempty\"`";
    else if (property.collection && property.collection === "map")
        return capitalizeFirstLetter(property.name) + " map[string]" + basicType + " `json:\""+property.name+",omitempty\"`";
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;

    return  capitalizeFirstLetter(property.name) + " "  + getPropertyGoType(property, datatype) + " `json:\""+property.name+",omitempty\"`";
}

function getPropertyGoType(property, datatype) {
    var optional = "";

    if (property.actualtype === "String")
        return "string";
    else if (property.actualtype === "Boolean")
        return "bool" + optional;
    else if (property.actualtype === "int16")
        return "int" + optional;
    else if (property.actualtype === "uint16")
        return "uint" + optional;
    else if (property.actualtype === "int32")
        return "int32" + optional;
    else if (property.actualtype === "uint32")
        return "uint32" + optional;
    else if (property.actualtype === "int64")
        return "int64" + optional;
    else if (property.actualtype === "uint64")
        return "uint64" + optional;
    else if (property.actualtype === "float")
        return "float32" + optional;
    else if (property.actualtype === "double")
        return "float64" + optional;
    else if (property.actualtype === "DateTime")
        return "time.Time" + optional;
    else if (property.isclass)
        return property.actualtype + "Model";
    else if (property.isenum)
        return property.actualtype + optional;
    else if (property.actualtype === "object")
        return "interface{}";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function capitalizeFirstLetter(string) 
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}