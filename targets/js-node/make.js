var path = require("path");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Node.js combined SDK to " + apiOutputDir);
    
    // Load the templates
    var templateDir = path.resolve(sourceDir, "templates");
    var coreTemplate = GetCompiledTemplate(path.resolve(templateDir, "playfab.js.ejs"));
    var npmTemplate = GetCompiledTemplate(path.resolve(templateDir, "package.json.ejs"));
    var apiTemplate = GetCompiledTemplate(path.resolve(templateDir, "api.js.ejs"));
    var apiTypingsTemplate = GetCompiledTemplate(path.resolve(templateDir, "PlayFab_Api.d.ts.ejs"));
    
    var destSubFolders = ["PlayFabSdk", "PlayFabTestingExample"]; // Write both the published folder and the testing folder
    for (var fIdx = 0; fIdx < destSubFolders.length; fIdx++) {
        var eachOutputDir = path.resolve(apiOutputDir, destSubFolders[fIdx]);
        
        copyTree(path.resolve(sourceDir, "source"), eachOutputDir);
        
        // Write the core functionality file
        var coreLocals = {};
        coreLocals.sdkVersion = exports.sdkVersion;
        coreLocals.buildIdentifier = exports.buildIdentifier;
        coreLocals.hasServerOptions = false;
        coreLocals.hasClientOptions = false;
        for (var a = 0; a < apis.length; a++) {
            if (apis[a].name === "Client")
                coreLocals.hasClientOptions = true;
            else
                coreLocals.hasServerOptions = true;
        }
        writeFile(path.resolve(eachOutputDir, "Scripts/PlayFab/PlayFab.js"), coreTemplate(coreLocals));
        
        // Write the package file
        var pkgLocals = {}
        pkgLocals.isTesting = (destSubFolders[fIdx] === "PlayFabTestingExample");
        pkgLocals.sdkVersion = exports.sdkVersion;
        pkgLocals.projectName = pkgLocals.isTesting ? "playfab-testing" : "playfab-sdk";
        pkgLocals.description = pkgLocals.isTesting ? "Playfab SDK automated testing example" : "Playfab SDK for node.js applications";
        pkgLocals.mainFile = pkgLocals.isTesting ? "PlayFabApiTests.js" : "main.js";
        writeFile(path.resolve(eachOutputDir, "package.json"), npmTemplate(pkgLocals));
        
        // Write the API files
        var apiLocals = {
            GenerateDatatype: GenerateDatatype,
            GenerateSummary: GenerateSummary,
            GetAuthParams: GetAuthParams,
            GetRequestActions: GetRequestActions,
            GetResultActions: GetResultActions,
            GetUrlAccessor: GetUrlAccessor,
            GetDeprecationAttribute: GetDeprecationAttribute,
            sourceDir: sourceDir
        };
        for (var i = 0; i < apis.length; i++) {
            apiLocals.api = apis[i];
            apiLocals.hasServerOptions = apis[i].name !== "Client";
            apiLocals.hasClientOptions = apis[i].name === "Client";
            writeFile(path.resolve(eachOutputDir, "Scripts/PlayFab/PlayFab" + apis[i].name + ".js"), apiTemplate(apiLocals));
            writeFile(path.resolve(eachOutputDir, "Scripts/typings/PlayFab/PlayFab" + apis[i].name + ".d.ts"), apiTypingsTemplate(apiLocals));
        }
    }
    
    // Copy testing files
    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "PlayFabTestingExample"));
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFab.settings.developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFab._internalSettings.sessionTicket";
    
    return "null, null";
}

function GetRequestActions(numSpaces, apiCall, api) {
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        output = "request.TitleId = PlayFab.settings.titleId != null ? PlayFab.settings.titleId : request.TitleId;\n    if (request.TitleId == null) throw \"Must be have PlayFab.settings.titleId set to call this method\";";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        output = "if (PlayFab._internalSettings.sessionTicket == null) throw \"Must be logged in to call this method\";";
    if (apiCall.auth === "SecretKey")
        output = "if (PlayFab.settings.developerSecretKey == null) throw \"Must have PlayFab.settings.DeveloperSecretKey set to call this method\";\n";
    
    if (output.length > 0) {
        var spaces = "";
        for (var i = 0; i < numSpaces; i++)
            spaces += " ";
        output = spaces + output;
    }
    
    return output;
}

function GetResultActions(numSpaces, apiCall, api) {
    var spaces = "";
    for (var i = 0; i < numSpaces; i++)
        spaces += " ";
    
    var output = "";
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        output = spaces + "if (result != null && result.data != null) {\n" 
            + spaces + "    PlayFab._internalSettings.sessionTicket = result.data.hasOwnProperty(\"SessionTicket\") ? result.data.SessionTicket : PlayFab._internalSettings.sessionTicket;\n" 
            + spaces + "    exports._MultiStepClientLogin(result.data.SettingsForUser.NeedsAttribution);\n" 
            + spaces + "}";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        output = spaces + "// Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n" 
            + spaces + "PlayFab.settings.advertisingIdType += \"_Successful\";\n";
    
    return output;
}

function GetUrlAccessor(apiCall) {
    return "PlayFab.GetServerUrl()";
}

function GetDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    
    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "/**\n" 
            + tabbing + " * @deprecated Please use " + apiObj.deprecation.ReplacedBy + " instead. \n" 
            + tabbing + " */\n";
    else if (isDeprecated)
        return tabbing + "/**\n" 
            + tabbing + " * @deprecated Do not use\n" 
            + tabbing + " */\n";
    return "";
}

function GenerateSummary(tabbing, element, summaryParam, extraLine) {
    var hasSummary = element.hasOwnProperty(summaryParam);
    if (!hasSummary && !extraLine) {
        return "";
    }
    
    var output = tabbing + "/**\n";
    if (hasSummary)
        output += tabbing + " / " + element[summaryParam] + "\n";
    if (extraLine)
        output += tabbing + " / " + extraLine + "\n";
    output += tabbing + " */\n";
    return output;
}

function GenerateDatatype(api, datatype, sourceDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var interfaceTemplate = GetCompiledTemplate(path.resolve(templateDir, "Interface.ejs"));
    var enumTemplate = GetCompiledTemplate(path.resolve(templateDir, "Enum.ejs"));
    
    var locals = {
        GenerateSummary: GenerateSummary,
        GetBaseTypeSyntax: GetBaseTypeSyntax,
        GetPropertyTsType: GetPropertyTsType,
        api: api,
        datatype: datatype
    };
    if (datatype.isenum)
        return enumTemplate(locals);
    return interfaceTemplate(locals);
}

function GetBaseTypeSyntax(datatype) {
    if (datatype.className.toLowerCase().endsWith("request"))
        return " extends PlayFabModule.IPlayFabRequestCommon";
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        return " extends PlayFabModule.IPlayFabResultCommon ";
    return ""; // If both are -1, then neither is greater
}

function GetPropertyTsType(property, datatype) {
    var output = undefined;
    
    if (property.actualtype === "String")
        output = "string";
    else if (property.actualtype === "Boolean")
        output = "boolean";
    else if (property.actualtype.contains("int") || property.actualtype === "float" || property.actualtype === "double" || property.actualtype === "decimal")
        output = "number";
    else if (property.actualtype === "DateTime")
        output = "string";
    else if (property.isclass)
        output = property.actualtype;
    else if (property.isenum)
        output = "string";
    else if (property.actualtype === "object")
        output = "any";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.className;
    
    if (property.collection === "array")
        output += "[]";
    else if (property.collection === "map")
        output = "{ [key: string]: " + output + " }";
    else if (property.collection)
        throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.className;
    
    var isOptional = property.optional;
    var isLoginRequest = ((datatype.name.contains("Login") && datatype.name.contains("Request")) || datatype.name === "RegisterPlayFabUserRequest");
    if (isLoginRequest && property.name === "TitleId")
        isOptional = true;

    return (isOptional ? "?" : "") + ": " + output;
}
