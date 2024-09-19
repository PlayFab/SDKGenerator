const path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = () => { };
if (typeof (templatizeTree) === "undefined") templatizeTree = () => { };

let propertyReplacements = {};

// generate.js looks for some specific exported functions (as defined in TOC.json) in make.js, like:
exports.makeCombinedAPI = (apis, sourceDir, apiOutputDir) => {
    // Builds every api.  The provided "apis" variable is a list of objects, Examples: API_SPECS/Legacy/PlayFab/admin.api.json, API_SPECS/Legacy/PlayFab/server.api.json, and API_SPECS/Legacy/PlayFab/client.api.json
    
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);

    try {
        propertyReplacements = require(path.resolve(sourceDir, "replacements.json"));
    } catch (ex) {
        throw "The file: replacements.json was not properly formatted JSON";
    }

    const envTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/settings.json.ejs"));
    writeFile(path.resolve(apiOutputDir, ".vscode/settings.json"), envTemplate());
    
    // Filter empty apis
    apis = apis.filter(api => api.calls.length > 0);

    var groupedApis = {};
    apis.forEach(api => {
        if (!groupedApis[api.name]) {
            groupedApis[api.name] = [];
        }
        api.calls.forEach(call => {
            var key = call.subgroup;
            if (!groupedApis[api.name][key]) {
                groupedApis[api.name][key] = [];
            }
            groupedApis[api.name][key].push(call);
        });
    });

    const locals = {
        apis: groupedApis,
        sdkVersion: sdkGlobals.sdkVersion,
        fixRequestExample: fixRequestExample,
        getBaseUrl: getBaseUrl,
        getHeaders: getHeaders,
        getVariables: getVariables,
        getVerticalTag: getVerticalTag
    };

    const template = getCompiledTemplate(path.resolve(sourceDir, "templates/playfab.http.ejs"));
    const generatedTemplateText = template(locals);
    writeFile(path.resolve(apiOutputDir, "playfab.http"), generatedTemplateText);
}

const checkReplacements = (apiName, obj) => {
    for (let replaceCategory in propertyReplacements) {
        if (replaceCategory === "generic") {
            for (let genReplaceName1 in propertyReplacements[replaceCategory])
                doReplace(obj, genReplaceName1, propertyReplacements[replaceCategory][genReplaceName1]);
        }
        if (replaceCategory === apiName) {
            for (let apiReplaceName in propertyReplacements[replaceCategory]) {
                if (apiReplaceName === "generic") {
                    for (let genReplaceName2 in propertyReplacements[replaceCategory][apiReplaceName])
                        doReplace(obj, genReplaceName2, propertyReplacements[replaceCategory][apiReplaceName][genReplaceName2]);
                }
                doReplace(obj, apiReplaceName, propertyReplacements[replaceCategory][apiReplaceName]);
            }
        }
    }
}

const doReplace = (obj, paramName, newValue) => {
    if (obj.hasOwnProperty(paramName)) {
        console.log("Replaced: " + obj[paramName] + " with " + newValue);
        obj[paramName] = newValue;
    }
};

const fixRequestExample = (apiName, example) => {
    if (example) {
        let output = JSON.parse(example);
        if (Object.keys(output).length === 0) return "";
        checkReplacements(apiName, output);
        return JSON.stringify(output, undefined, 2);
    }
    return example;
}gi

const getBaseUrl = () => {
    if (sdkGlobals.verticalName) {
        // verticalName isn't an established variable in Postman, and we know it here, so we can just apply it
        return "https://" + sdkGlobals.verticalName + ".{{domain}}";
    }
    return "https://{{titleId}}.{{domain}}";
}

const getHeaders = (apiCall) => {
    let headers = [];
    headers.push('Accept-Encoding: gzip');
    headers.push('Content-Type: application/json');
    headers.push(`X-PlayFabSDK: RESTClientCollection-${sdkGlobals.sdkVersion}`);
    if (apiCall.url === "/Authentication/GetEntityToken") {
        headers.push('X-Authorization: {{sessionTicket}}');
        headers.push('X-SecretKey: {{secretKey}}');
        return headers.join('\n');
    }

    if (apiCall.auth === "SessionTicket") {
        headers.push('X-Authorization: {{sessionTicket}}');
        return headers.join('\n');
    }

    if (apiCall.auth === "SecretKey") {
        headers.push('X-SecretKey: {{secretKey}}');
        return headers.join('\n');
    }

    if (apiCall.auth === "EntityToken") {
        headers.push('X-EntityToken: {{entityToken}}');
        return headers.join('\n');
    }

    return headers.join('\n');
}

const getVariables = () => {
    let variables = [];
    variables.push("@entityToken = {{GetEntityToken.response.body.data.EntityToken}}");
    variables.push("# LoginWithCustomID can be replaced by other authentication methods (e.g., LoginWithFacebook)");
    variables.push("@sessionTicket = {{LoginWithCustomID.response.body.data.SessionTicket}}");
    variables.push("@playFabId = {{LoginWithCustomID.response.body.data.PlayFabId}}");
    variables.push("@characterId = {{GrantCharacterToUser.response.body.data.CharacterId}}");
    variables.push("@newsId = {{AddNews.response.body.data.NewsId}}");
    variables.push("@sharedSecretKey = {{CreatePlayerSharedSecret.response.body.data.SecretKey}}");
    variables.push("@segmentId = {{ GetPlayerSegments.response.body.data.Segments[0].Id }}");

    return variables.join('\n');
}

const getVerticalTag = () => {
    if (sdkGlobals.verticalName) {
        return " for vertical: " + sdkGlobals.verticalName;
    }

    return "";
}