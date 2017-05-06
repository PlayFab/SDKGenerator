var path = require("path");

exports.putInRoot = true;

var PropertyReplacements = {};

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Postman combined Collection to " + apiOutputDir);
    
    try {
        PropertyReplacements = require(path.resolve(sourceDir, "replacements.json"));
    } catch (ex) {
        throw "The file: replacements.json was not properly formatted JSON";
    }
    
    for (var a = 0; a < apis.length; a++) {
        apis[a].calls.sort(CallSorter);
    }
    
    var apiLocals = {};
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.apis = apis;
    apiLocals.GetUrl = GetUrl;
    apiLocals.GetPostmanHeader = GetPostmanHeader;
    apiLocals.GetPostmanDescription = GetPostmanDescription;
    apiLocals.GetRequestExample = GetRequestExample;
    
    var outputFile = path.resolve(apiOutputDir, "playfab.json");
    var templateDir = path.resolve(sourceDir, "templates");
    var apiTemplate = GetCompiledTemplate(path.resolve(templateDir, "playfab.json.ejs"));
    writeFile(outputFile, apiTemplate(apiLocals));
    
    try {
        require(outputFile); // Read the destination file and make sure it is correctly formatted json
    } catch (ex) {
        throw "The Postman Collection output was not properly formatted JSON:\n" + outputFile;
    }
}

function CallSorter(a, b) {
    if (a.name > b.name) {
        return 1;
    }
    if (a.name < b.name) {
        return -1;
    }
    // a must be equal to b
    return 0;
}

function GetUrl(apiCall) {
    return "https://{{TitleId}}.playfabapi.com" + apiCall.url;
}

function GetPostmanHeader(auth) {
    if (auth === "SessionTicket")
        return "X-PlayFabSDK: PostmanCollection-" + exports.sdkVersion + "\\nContent-Type: application/json\\nX-Authentication: {{SessionTicket}}\\n";
    else if (auth === "SecretKey")
        return "X-PlayFabSDK: PostmanCollection-" + exports.sdkVersion + "\\nContent-Type: application/json\\nX-SecretKey: {{SecretKey}}\\n";
    else if (auth === "None")
        return "X-PlayFabSDK: PostmanCollection-" + exports.sdkVersion + "\\nContent-Type: application/json\\n";
    
    return "";
}

function JsonEscape(input) {
    if (input != null)
        input = input.replace(/\r/g, "").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
    return input;
}

function GetPostmanDescription(api, apiCall) {
    var isProposed = apiCall.hasOwnProperty("deprecation");
    var isDeprecated = isProposed && (new Date() > new Date(apiCall.deprecation.DeprecatedAfter));
    
    var output = "";
    if (isProposed && !isDeprecated)
        output += "As of " + apiCall.deprecation.ProposedAfter + ", this API has been proposed for deprecation. As of " + apiCall.deprecation.DeprecatedAfter + ", it will be officially deprecated and no longer supported.\\n\\n";
    else if (isProposed && isDeprecated)
        output += "As of " + apiCall.deprecation.ProposedAfter + ", this API has been deprecated. As of " + apiCall.deprecation.ObsoleteAfter + ", it will be officially obsolete and no longer published in the SDKs.\\n\\n";
    if (isProposed && apiCall.deprecation.ReplacedBy)
        output += "Please use the replacement API instead: " + apiCall.deprecation.ReplacedBy + "\\n\\n";
    
    if (isDeprecated)
        return output;
    
    output += JsonEscape(apiCall.summary); // Make sure quote characters are properly escaped
    if (!isProposed)
        output += "\\n\\nApi Documentation: https://api.playfab.com/Documentation/" + api.name + "/method/" + apiCall.name;
    
    output += "\\n\\n**The following case-sensitive environment variables are required for this call:**";
    output += "\\n\\n\\\"TitleId\\\" - The Title Id of your game, available in the Game Manager (https://developer.playfab.com)";
    if (apiCall.auth === "SessionTicket")
        output += "\\n\\n\\\"SessionTicket\\\" - The string returned as \\\"SessionTicket\\\" in response to any Login API.";
    if (apiCall.auth === "SecretKey")
        output += "\\n\\n\\\"SecretKey\\\" - The PlayFab API Secret Key, available in Game Manager for your title (https://developer.playfab.com/en-us/{{titleId}}/settings/credentials)";
    
    var props = api.datatypes[apiCall.request].properties;
    if (props.length > 0)
        output += "\\n\\n**The body of this api-call should be proper json-format.  The api-body accepts the following case-sensitive parameters:**";
    for (var p = 0; p < props.length; p++) {
        output += "\\n\\n\\\"" + props[p].name + "\\\": " + JsonEscape(props[p].description);
    }
    
    output += "\\n\\nTo set up an Environment, click the text next to the eye icon up top in Postman (it should say \"No environment\", if this is your first time using Postman). Select \"Manage environments\", then \"Add\". Type a name for your environment where it says \"New environment\", then enter each variable name above as the \"Key\", with the value as defined for each above.".replace(/"/g, "\\\"");
    
    return output;
}

function GetCorrectedRequestExample(api, apiCall) {
    var output = JSON.parse(apiCall.requestExample);
    CheckReplacements(api, output);
    return "\"" + JsonEscape(JSON.stringify(output, null, 2)) + "\"";
}

var DoReplace = function (obj, paramName, newValue) {
    if (obj.hasOwnProperty(paramName)) {
        console.log("Replaced: " + obj[paramName] + " with " + newValue);
        obj[paramName] = newValue;
    }
};

function CheckReplacements(api, obj) {
    for (var replaceCategory in PropertyReplacements) {
        if (replaceCategory === "generic") {
            for (var genReplaceName1 in PropertyReplacements[replaceCategory])
                DoReplace(obj, genReplaceName1, PropertyReplacements[replaceCategory][genReplaceName1]);
        }
        if (replaceCategory === api.name) {
            for (var apiReplaceName in PropertyReplacements[replaceCategory]) {
                if (apiReplaceName === "generic") {
                    for (var genReplaceName2 in PropertyReplacements[replaceCategory][apiReplaceName])
                        DoReplace(obj, genReplaceName2, PropertyReplacements[replaceCategory][apiReplaceName][genReplaceName2]);
                }
                DoReplace(obj, apiReplaceName, PropertyReplacements[replaceCategory][apiReplaceName]);
            }
        }
    }
}

function GetRequestExample(api, apiCall) {
    var msg = null;
    if (apiCall.requestExample.length > 0 && apiCall.requestExample.indexOf("{") >= 0) {
        if (apiCall.requestExample.indexOf("\\\"") === -1) // I can't handle json in a string in json in a string...
            return GetCorrectedRequestExample(api, apiCall);
        else
            msg = "CANNOT PARSE EXAMPLE BODY: ";
    }
    
    var props = api.datatypes[apiCall.request].properties;
    var output = {};
    for (var p = 0; p < props.length; p++) {
        output[props[p].name] = props[p].jsontype;
    }
    
    if (msg == null)
        msg = "AUTO GENERATED BODY FOR: ";
    console.log(msg + api.name + "." + apiCall.name);
    // console.log("    " + JSON.stringify(output, null, 2));
    return "\"" + JsonEscape(JSON.stringify(output, null, 2)) + "\"";;
}
