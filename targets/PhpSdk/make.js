var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);

    var locals = {
        sdkVersion: exports.sdkVersion
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    for (var a = 0; a < apis.length; a++)
        makeApi(apis[a], sourceDir, apiOutputDir);
}

function makeApi(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        sdkVersion: exports.sdkVersion,
        generateApiSummary: generateApiSummary,
        getAuthKey: getAuthKey,
        getRequestActions: getRequestActions
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApi.php.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.php"), apiTemplate(locals));
}

function getAuthKey(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\"";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authentication\"";
    else if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\"";
    return "null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "if (!isset($titleId)) $titleId = PlayFabSettings::$titleId;\n"
            + tabbing + "if (!isset($request->$titleId)) !$request->titleId = $titleId;\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "//TODO: Check the sessionTicket\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "//TODO: Check the devSecretKey\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "//TODO: Check the entityToken\n";

    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0])
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    else if (lines.length > 0)
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    else
        output = "";
    return output;
}
