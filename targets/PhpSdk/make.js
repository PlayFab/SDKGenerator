var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabSDK");
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);

    var locals = {
        sdkVersion: sdkGlobals.sdkVersion,
        getVerticalNameDefault: getVerticalNameDefault
    };

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    for (var a = 0; a < apis.length; a++)
        makeApi(apis[a], sourceDir, apiOutputDir);
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

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApi.php.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.php"), apiTemplate(locals));
}

function getVerticalNameDefault() {
    if (sdkGlobals.verticalName) {
        return "\"" + sdkGlobals.verticalName + "\"";
    }

    return "null";
}

function getCurlAuthParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "$authKey, $authValue";
    if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", $entityToken";
    if (apiCall.auth === "SessionTicket")
        return "\"X-Authentication\", $clientSessionTicket";
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", $developerSecreteKey";
    return "null, null";
}

function getRequestActions(tabbing, apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return tabbing + "if (!is_null($entityToken)) { $authKey = \"X-EntityToken\"; $authValue = $entityToken; }\n"
            + tabbing + "elseif (!is_null($clientSessionTicket)) { $authKey = \"X-Authentication\"; $authValue = $clientSessionTicket; }\n"
            + tabbing + "elseif (!is_null($developerSecreteKey)) { $authKey = \"X-SecretKey\"; $authValue = $developerSecreteKey; }\n";
    if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        return tabbing + "if (!isset($titleId)) $titleId = PlayFabSettings::$titleId;\n"
            + tabbing + "if (!isset($request->$titleId)) !$request->titleId = $titleId;\n";
    if (apiCall.auth === "EntityToken")
        return tabbing + "//TODO: Check the entityToken\n";
    if (apiCall.auth === "SessionTicket")
        return tabbing + "//TODO: Check the sessionTicket\n";
    if (apiCall.auth === "SecretKey")
        return tabbing + "//TODO: Check the devSecretKey\n";

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

function getAuthInputParams(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "$entityToken, $clientSessionTicket, $developerSecreteKey, ";
    if (apiCall.auth === "EntityToken")
        return "$entityToken, ";
    if (apiCall.auth === "SessionTicket")
        return "$clientSessionTicket, ";
    if (apiCall.auth === "SecretKey")
        return "$developerSecreteKey, ";
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
        var customTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/GetEntityTokenExtra.php.ejs"));
        return customTemplate(locals);
    }
    return "";
}
