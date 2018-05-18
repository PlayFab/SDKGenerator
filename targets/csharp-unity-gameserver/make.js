var path = require("path");
var unityV2 = require("../unity-v2/make.js");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

// exports.putInRoot = true;

// Build the SDK into the gameserver and example-client, as they'd appear if taken from nightly
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {

    makeSdk(apis, sourceDir, path.resolve(apiOutputDir, "GameServerSource/Assets/PlayFabSDK")); // GameServer
    makeSdk(apis, sourceDir, path.resolve(apiOutputDir, "PlayFabGameServerClientExample/Assets/PlayFabSDK")); // Client Example
}

function makeSdk(apis, sourceDir, apiOutputDir) {
    sourceDir = path.resolve(sourceDir, "../unity-v2");
    unityV2.MakeUnityV2Sdk(apis, sourceDir, apiOutputDir);
}
