var path = require("path");
var cppMakeJsPath = require("./makeCpp.js");
var commonMakeJsPath = require("./makeCommon.js");
var bpMakeJsPath = require("./makebp.js");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

var copyright =
`//////////////////////////////////////////////////////
// Copyright (C) Microsoft. 2018. All rights reserved.
//////////////////////////////////////////////////////
`;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {

    var ueTargetVersion = "4.20";
    var sdkVersion = exports.sdkVersion;
    var buildIdentifier = exports.buildIdentifier;

    // Create the Source folder in the plugin with all the modules
    bpMakeJsPath.makeBpCombinedAPI(apis, copyright, sourceDir, apiOutputDir, ueTargetVersion, sdkVersion, buildIdentifier);
    cppMakeJsPath.makeCppCombinedAPI(apis, copyright, sourceDir, apiOutputDir, ueTargetVersion, sdkVersion, buildIdentifier);
    commonMakeJsPath.makeCommonCombinedAPI(apis, copyright, sourceDir, apiOutputDir, ueTargetVersion, sdkVersion, buildIdentifier);

    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        apis: apis,
        ueTargetVersion: ueTargetVersion,
        sdkVersion: sdkVersion,
        copyright: copyright,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey")
    };

    // Copy the resources, content and the .uplugin file
    templatizeTree(locals, path.resolve(sourceDir, "source/PlayFab/Content"), path.resolve(apiOutputDir, "PlayFabPlugin/PlayFab/Content"));
    templatizeTree(locals, path.resolve(sourceDir, "source/PlayFab/Resources"), path.resolve(apiOutputDir, "PlayFabPlugin/PlayFab/Resources"));
    templatizeTree(locals, path.resolve(sourceDir, "source/PlayFab/PlayFab.uplugin.ejs"), path.resolve(apiOutputDir, "PlayFabPlugin/PlayFab/PlayFab.uplugin.ejs"));

    // Create the Example project folder
    templatizeTree(locals, path.resolve(sourceDir, "examplesource"), apiOutputDir);

    // Copy the PlayFabPlugin folder just created into the ExampleProject
    templatizeTree(locals, path.resolve(apiOutputDir, "PlayFabPlugin"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}