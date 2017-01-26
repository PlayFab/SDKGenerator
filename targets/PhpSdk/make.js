var path = require("path");

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        MakeApi(apis[i], sourceDir, apiOutputDir);
}

//function MakeSimpleFiles(apis, sourceDir, apiOutputDir) {
//}

function MakeApi(api, sourceDir, apiOutputDir) {
    var locals = {
        api: api,
        sdkVersion: exports.sdkVersion,
        GenerateSummary: GenerateSummary,
        GetAuthKey: GetAuthKey,
        GetRequestActions: GetRequestActions
    };
    
    var template = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApi.php.ejs"));
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

function GenerateSummary(tabbing, element, summaryParam, extraLine) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    var output = tabbing + "/// <summary>\n";
    output += tabbing + "/// " + element[summaryParam] + "\n";
    if (extraLine)
        output += tabbing + "/// " + extraLine + "\n";
    output += tabbing + "/// </summary>\n";
    return output;
}
