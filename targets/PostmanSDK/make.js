var path = require('path');

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Postman combined SDK to " + apiOutputDir);
    
    var templateDir = path.resolve(sourceDir, "templates");
    
    var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.json.ejs")));
    
    var propertyReplacements = null;
    try {
        propertyReplacements = require(path.resolve(sourceDir, "replacements.json"));
    } catch (ex) {
        throw "The file: replacements.json was not properly formatted JSON";
    }
    
    for (var a in apis) {
        apis[a].calls.sort(callSorter);
    }
    
    var apiLocals = {};
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.apis = apis;
    apiLocals.propertyReplacements = propertyReplacements;
    apiLocals.getUrl = getUrl;
    apiLocals.getPostmanHeader = getPostmanHeader;
    apiLocals.getPostmanDescription = getPostmanDescription;
    apiLocals.getPostBodyPropertyValue = getPostBodyPropertyValue;
    apiLocals.getRequestExample = getRequestExample;
    var generatedApi = apiTemplate(apiLocals);
    
    var outputFile = path.resolve(apiOutputDir, "playfab.json");
    writeFile(outputFile, generatedApi);
    
    try {
        require(outputFile); // Read the destination file and make sure it is correctly formatted json
    } catch (ex) {
        throw "The Postman SDK output was not properly formatted JSON:\n" + outputFile;
    }
}

function callSorter(a, b) {
    if (a.name > b.name) {
        return 1;
    }
    if (a.name < b.name) {
        return -1;
    }
    // a must be equal to b
    return 0;
}

function getUrl(apiCall) {
    if (apiCall.name != "RunCloudScript")
        return "https://{{TitleId}}.playfabapi.com" + apiCall.url;
    return "{{LogicUrl}}" + apiCall.url;
}

function getPostmanHeader(auth) {
    if (auth == "SessionTicket")
        return "Content-Type: application/json\\nX-Authentication: {{SessionTicket}}\\n";
    else if (auth == "SecretKey")
        return "Content-Type: application/json\\nSecretKey: {{SecretKey}}\\n";
    else if (auth == "None")
        return "Content-Type: application/json\\n";
    
    return "";

    //<% if(apiCall.auth == "SessionTicket"){ %>			"headers": "Content-Type: application/json\nX-Authentication: {{SessionTicket}}\n",
    //<% } else if(apiCall.auth == "SecretKey"){ %>			"headers": "Content-Type: application/json\nSecretKey: {{SecretKey}}\n",
    //<% } else{ %>			"headers": "Content-Type: application/json\n",
    //<% } %>
}

function jsonEscape(input) {
    input = input.replace(/\r/g, "").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
    return input;
}

function getPostmanDescription(apiCall) {
    var output = "";
    output += jsonEscape(apiCall.summary); // Make sure quote characters are properly escaped
    
    output += "\\n\\nThis is still under development, and is not yet ready for general use.  Experienced users can utilize this if they carefully examine the post-body and ensure the data is properly entered.  By default, the post-body is NOT defaulting to useable values.";
    
    output += "\\n\\nSet the following variables in your Environment (they are case sensitive):";
    output += "\\n\\nTitleId - The Title Id of your game, available in the Game Manager (https://developer.playfab.com)";
    
    if (apiCall.auth == "SessionTicket")
        output += "\\n\\nSessionTicket - The string returned as \"SessionTicket\" in response to any sign in operation.  ".replace(/"/g, "\\\"");
    if (apiCall.auth == "SecretKey")
        output += "\\n\\nSecretKey - The PlayFab API Secret Key, available in the dashboard of your title (https://developer.playfab.com/title/properties/{{titleId}})";
    if (apiCall.name == "RunCloudScript")
        output += "\\n\\LogicUrl - You must call GetCloudScriptUrl first, and copy the result into this envrionment variable.";
    
    output += "\\n\\nTo set up an Environment, click the text next to the eye icon up top in Postman (it should say \"No environment\", if this is your first time using Postman). Select \"Manage environments\", then \"Add\". Type a name for your environment where it says \"New environment\", then enter each variable name above as the \"Key\", with the value as defined for each above.".replace(/"/g, "\\\"");
    
    return output;
}

function getPostBodyPropertyValue(apiName, apiCall, prop, propertyReplacements) {
    var output = "\"" + prop.jsontype + "\""; // The default output if there are no replacements
    
    if (propertyReplacements != null) {
        if (propertyReplacements["generic"] != null && propertyReplacements["generic"][prop.name] != null) {
            output = propertyReplacements["generic"][prop.name];
        }
        if (propertyReplacements[apiName] != null) {
            if (propertyReplacements[apiName]["generic"] != null && propertyReplacements[apiName]["generic"][prop.name] != null) {
                output = propertyReplacements[apiName]["generic"][prop.name];
            }
            if (propertyReplacements[apiName][apiCall] != null && propertyReplacements[apiName][apiCall][prop.name] != null) {
                output = propertyReplacements[apiName][apiCall][prop.name];
            }
        }
    }
    
    return jsonEscape(output);
}

function getRequestExample(api, apiCall, propertyReplacements) {
    var msg = null;
    if (apiCall.requestExample.length > 0 && apiCall.requestExample.indexOf("{") >= 0) {
        if (apiCall.requestExample.indexOf("\\\"") == -1) // I can't handle json in a string in json in a string...
            return "\"" + jsonEscape(apiCall.requestExample) + "\"";
        else
            msg = "CANNOT PARSE EXAMPLE BODY: "
    }
    
    var apiNameLC = api.name.toLowerCase();
    
    var props = api.datatypes[apiCall.request].properties;
    var output = "\"{"
    for (var p in props) {
        output += "\\\"" + props[p].name + "\\\": ";
        output += getPostBodyPropertyValue(apiNameLC, apiCall.name, props[p], propertyReplacements);
        if (parseInt(p) + 1 < props.length)
            output += ","
    }
    output += "}\""
    
    if (msg == null)
        msg = "AUTO GENERATED BODY FOR: "
    console.log(msg + api.name + "." + apiCall.name);
    // console.log("    " + output);
    return output;
}
