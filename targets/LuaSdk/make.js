var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

// exports.putInRoot = true;

exports.makeClientAPI2 = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabClientSdk");
    makeLuaDistSdk(apis, sourceDir, apiOutputDir, "Client");
    copyTree(path.resolve(sourceDir, "SharedTesting"), apiOutputDir); // SharedTesting in Client only

    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabClientSdk");
    makeDefold(apis, sourceDir, apiOutputDir, "DefoldClient");
    copyTree(path.resolve(sourceDir, "SharedTesting"), apiOutputDir); // SharedTesting in Client only

    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/client/lua/plugin/playfab/client");
    makeCorona(apis, sourceDir, apiOutputDir, "CoronaClient", "plugin.playfab.client.");
    // Corona testing is copied separately
}

exports.makeServerAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabServerSdk");
    makeLuaDistSdk(apis, sourceDir, apiOutputDir, "Server");

    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabServerSdk");
    makeDefold(apis, sourceDir, apiOutputDir, "DefoldServer");

    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/server/lua/plugin/playfab/server");
    makeCorona(apis, sourceDir, apiOutputDir, "CoronaServer", "plugin.playfab.server.");
}

exports.makeCombinedAPI = function (apis, sourceDir, baseOutputDir) {
    var apiOutputDir = path.resolve(baseOutputDir, "PlayFabSdk");
    makeLuaDistSdk(apis, sourceDir, apiOutputDir, "Combined");

    apiOutputDir = path.resolve(baseOutputDir, "_Build/Defold/PlayFabSdk");
    makeDefold(apis, sourceDir, apiOutputDir, "DefoldCombined");

    apiOutputDir = path.resolve(baseOutputDir, "_Build/CoronaPluginBuilders/combo/lua/plugin/playfab/combo");
    makeCorona(apis, sourceDir, apiOutputDir, "CoronaCombined", "plugin.playfab.combo.");

    copyTree(path.resolve(sourceDir, "GlobalFiles"), baseOutputDir);
}

function makeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix, sdkVersionString) {
    console.log("Generating " + sdkDescriptor + " api\n    from: " + sourceDir + "\n    to: " + apiOutputDir);

    var locals = {
        buildIdentifier: exports.buildIdentifier,
        sdkVersionString: sdkVersionString,
        hasClientOptions: false,
        requirePrefix: requirePrefix // Corona is in a top-level subfolder which is not present in any other sdk
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            locals.hasClientOptions = true;
    }

    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir);
    for (var a = 0; a < apis.length; a++)
        makeApi(apis[a], sourceDir, apiOutputDir, requirePrefix);
}

function makeLuaDistSdk(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    var sdkVersionString = "LuaSdk_" + exports.sdkVersion;
    makeCoreSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFab"), sdkDescriptor, "PlayFab.", sdkVersionString);
    copyTree(path.resolve(sourceDir, "LuaDist"), apiOutputDir);
}

function makeDefold(apis, sourceDir, apiOutputDir, sdkDescriptor) {
    var sdkVersionString = "DefoldSdk_" + exports.sdkVersion;
    makeCoreSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFab"), sdkDescriptor, "PlayFab.", sdkVersionString);
    copyTree(path.resolve(sourceDir, "EachDefold"), apiOutputDir);

    var locals = {
        sdkDescriptor: sdkDescriptor, // sdkDescriptor is only used in Defold Templates
        sdkVersion: exports.sdkVersion
    }

    var projTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Defold/PlayFabSdk.project.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSdk.project"), projTemplate(locals));

    if (sdkDescriptor.indexOf("Client") > -1) {
        var testTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Defold/PlayFabTestExample.project.ejs"));
        writeFile(path.resolve(apiOutputDir, "PlayFabTestExample.project"), testTemplate(locals));
    }
}

function makeCorona(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix) {
    var locals = {
        requirePrefix: requirePrefix
    }

    var httpsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Corona/PlayFabHttpsCorona.lua.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabHttpsCorona.lua"), httpsTemplate(locals));

    var sdkVersionString = "CoronaSdk_" + exports.sdkVersion;
    makeCoreSdk(apis, sourceDir, apiOutputDir, sdkDescriptor, requirePrefix, sdkVersionString); // requirePrefix is mostly for Corona
    copyTree(path.resolve(sourceDir, "EachCorona"), apiOutputDir);
}

function makeApi(api, sourceDir, apiOutputDir, requirePrefix) {
    var locals = {
        api: api,
        generateApiSummary: generateApiSummary,
        getRequestActions: getRequestActions,
        getAuthentication: getAuthentication,
        hasClientOptions: api.name === "Client",
        requirePrefix: requirePrefix // Corona is in a top-level subfolder which is not present in any other sdk
    };

    var template = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabApi.lua.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab" + api.name + "Api.lua"), template(locals));
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines, true);

    var output = "";
    if (lines.length === 1 && lines[0])
        output = tabbing + "-- " + lines.join("\n" + tabbing + "-- ") + "\n";
    else if (lines.length > 0)
        output = tabbing + "-- " + lines.join("\n" + tabbing + "-- ") + "\n";
    return output;
}

function getRequestActions(tabbing, apiCall) {
    var requestAction = "";

    if (apiCall.url === "/Authentication/GetEntityToken")
        requestAction = tabbing + "local authKey = nil\n"
            + tabbing + "local authValue = nil\n"
            + tabbing + "if (PlayFabSettings._internalSettings.entityToken) then\n"
            + tabbing + "    authKey = \"X-EntityToken\"\n"
            + tabbing + "    authValue = PlayFabSettings._internalSettings.entityToken\n"
            + tabbing + "end\n"
            + tabbing + "if (PlayFabSettings._internalSettings.sessionTicket) then\n"
            + tabbing + "    authKey = \"X-Authorization\"\n"
            + tabbing + "    authValue = PlayFabSettings._internalSettings.sessionTicket\n"
            + tabbing + "end\n"
            + tabbing + "if (PlayFabSettings.settings.devSecretKey) then\n"
            + tabbing + "    authKey = \"X-SecretKey\"\n"
            + tabbing + "    authValue = PlayFabSettings.settings.devSecretKey\n"
            + tabbing + "end\n";
    else if (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")
        requestAction = tabbing + "request.TitleId = PlayFabSettings.settings.titleId\n";
    else if (apiCall.result === "AttributeInstallResult")
        requestAction = tabbing + "if (not PlayFabClientApi.IsClientLoggedIn()) then error(\"Must be logged in to call this method\") end\n"
            + tabbing + "PlayFabSettings.settings.advertisingIdType = PlayFabSettings.settings.advertisingIdType .. \"_Successful\"\n";
    else if (apiCall.auth === "SessionTicket")
        requestAction = tabbing + "if (not PlayFabClientApi.IsClientLoggedIn()) then error(\"Must be logged in to call this method\") end\n";
    else if (apiCall.auth === "SecretKey")
        requestAction = tabbing + "if (not PlayFabSettings.settings.titleId or not PlayFabSettings.settings.devSecretKey) then error(\"Must have PlayFabSettings.settings.devSecretKey set to call this method\") end\n";
    else if (apiCall.auth === "EntityToken")
        requestAction = tabbing + "if (not PlayFabSettings.settings.titleId or not PlayFabSettings._internalSettings.entityToken) then error(\"Must call GetEntityToken first, to call this method\") end\n";

    requestAction += getResultAction(tabbing, apiCall);
    return requestAction;
}

function getResultAction(tabbing, apiCall) {
    var preCallback = "";
    var postCallback = "";
    var internalTabbing = tabbing + "    ";
    if (apiCall.url === "/Authentication/GetEntityToken")
        preCallback = internalTabbing + "PlayFabSettings._internalSettings.entityToken = result.EntityToken\n";
    else if (apiCall.result === "LoginResult") {
        preCallback = internalTabbing + "PlayFabSettings._internalSettings.sessionTicket = result.SessionTicket\n"
            + internalTabbing + "if (result.Entity) then PlayFabSettings._internalSettings.entityToken = result.Entity.EntityToken end\n";
        postCallback = internalTabbing + "PlayFabClientApi._MultiStepClientLogin(result.SettingsForUser.NeedsAttribution)\n";
    }
    else if (apiCall.request === "RegisterPlayFabUserRequest") {
        preCallback = internalTabbing + "PlayFabSettings._internalSettings.sessionTicket = result.SessionTicket\n";
        postCallback = internalTabbing + "PlayFabClientApi._MultiStepClientLogin(result.SettingsForUser.NeedsAttribution)\n";
    }

    var resultAction = "";
    if (preCallback || postCallback) // Wrap the logic and the callback in a secondary callback wrapper
        resultAction = "\n" + tabbing + "local externalOnSuccess = onSuccess\n"
            + tabbing + "function wrappedOnSuccess(result)\n"
            + preCallback
            + tabbing + "    if (externalOnSuccess) then\n"
            + tabbing + "        externalOnSuccess(result)\n"
            + tabbing + "    end\n"
            + postCallback
            + tabbing + "end\n"
            + tabbing + "onSuccess = wrappedOnSuccess\n";
    return resultAction;
}

function getAuthentication(apiCall) {
    if (apiCall.url === "/Authentication/GetEntityToken")
        return "authKey, authValue";
    if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", PlayFabSettings._internalSettings.sessionTicket";
    else if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings.settings.devSecretKey";
    else if (apiCall.auth === "EntityToken")
        return "\"X-EntityToken\", PlayFabSettings._internalSettings.entityToken";
    return "nil, nil";
}
