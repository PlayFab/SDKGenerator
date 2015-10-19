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
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getUrlAccessor = getUrlAccessor;
    apiLocals.getPostmanHeader = getPostmanHeader;
    apiLocals.getPostmanDescription = getPostmanDescription;
    apiLocals.getPostBodyPropertyValue = getPostBodyPropertyValue;
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

function getAuthParams(apiCall) {
    return "null, null";
}

function getRequestActions(apiCall, api) {
    return "";
}

function getResultActions(apiCall, api) {
    return "";
}

function getUrlAccessor(apiCall) {
    return "get_server_url()";
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
    input = input.replace(/\n/g, "\\n").replace(/"/g, "\\\"");
    return input;
}

function getPostmanDescription(auth, summary) {
    var output = "";
    output += jsonEscape(summary); // Make sure quote characters are properly escaped
    
    output += "\\n\\nThis is still under development, and is not yet ready for general use.  Experienced users can utilize this if they carefully examine the post-body and ensure the data is properly entered.  By default, the post-body is NOT defaulting to useable values.";
    
    output += "\\n\\nSet the following variables in your Environment (they are case sensitive):";
    output += "\\n\\nTitleId - The Title Id of your game, available in the Game Manager (https://developer.playfab.com)";
    
    if (auth == "SessionTicket")
        output += "\\n\\nSessionTicket - The string returned as \"SessionTicket\" in response to any sign in operation".replace(/"/g, "\\\"");
    if (auth == "SecretKey")
        output += "\\n\\nSecretKey - The PlayFab API Secret Key, available in the dashboard of your title (https://developer.playfab.com/title/properties/{{titleId}})";
    
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
    
    output = jsonEscape(output);
    console.log(apiName + "," + apiCall + "," + prop.name + "=" + output);
    
    return output;
}
