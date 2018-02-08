var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);
}

//function MakeSimpleFiles(apis, sourceDir, apiOutputDir) {
//}

function makeApi(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        sdkVersion: exports.sdkVersion,
        generateApiSummary: generateApiSummary,
        GetAuthKey: GetAuthKey,
        GetRequestActions: GetRequestActions
    };
    
    var template = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApi.php.ejs"));
    var generatedTemplateText = template(locals);
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.php"), generatedTemplateText);
}

function GetAuthKey(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\"";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authentication\"";
    return "null";
}

function GetRequestActions(tabbing, apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return tabbing + "if (!isset($titleId)) $titleId = PlayFabSettings::$titleId;\n" 
            + tabbing + "if (!isset($request->$titleId)) !$request->titleId = $titleId;\n";
    if (api.name === "Client" && apiCall.auth === "SessionTicket")
        return tabbing + "//TODO: Check the sessionTicket\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "//TODO: Check the devSecretKey\n";
    
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else if (lines.length > 0) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else {
        output = "";
    }
    return output;
}
