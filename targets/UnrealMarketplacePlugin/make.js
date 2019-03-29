var path = require("path");
var cppMakeJsPath = require("./makeCpp.js");
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

exports.makeCombinedAPI = function (apis, sourceDir, baseApiOutputDir) {
    class TargetVersion {
        constructor(inMajor, inMinor, inPatch) {
            this.major = inMajor;
            this.minor = inMinor;
            this.patch = inPatch;
        }
        get targetVersionShort() {
            return `${this.major}.${this.minor}`;
        }

        get targetVersionLong() {
            return `${this.major}.${this.minor}.${this.patch}`;
        }
    }

    // The list of current supported UE versions - Intended to be the latest 3
    const ueTargetVersions = [
        new TargetVersion(4, 19, 0),
        new TargetVersion(4, 20, 0),
        new TargetVersion(4, 21, 0)
    ];

    var ueWhitelistPlatforms = '[ "Win64", "Win32", "Mac", "IOS", "Android" ]'; // TODO: Add PS4, Switch, and XBox once the testing stories are done

    for (var v = 0; v < ueTargetVersions.length; v++) {
        var ueTargetVersion = ueTargetVersions[v];
        var apiOutputDir = path.resolve(baseApiOutputDir, ueTargetVersion.targetVersionShort); // Break multiple versions into separate top level folders

        console.log("Generating Unreal Plugin to " + apiOutputDir);

        // Create the Source folder in the plugin with all the modules
        bpMakeJsPath.makeBpCombinedAPI(apis, copyright, sourceDir, apiOutputDir, ueTargetVersion.targetVersionShort, sdkGlobals.sdkVersion, sdkGlobals.buildIdentifier);
        cppMakeJsPath.makeCppCombinedAPI(apis, copyright, sourceDir, apiOutputDir, ueTargetVersion.targetVersionShort, sdkGlobals.sdkVersion, sdkGlobals.buildIdentifier);

        var authMechanisms = getAuthMechanisms(apis);
        var locals = {
            apis: apis,
            buildIdentifier: sdkGlobals.buildIdentifier,
            copyright: copyright,
            enumTypes: collectEnumsFromApis(apis),
            errorList: apis[0].errorList,
            errors: apis[0].errors,
            generateBpApiSummary: bpMakeJsPath.generateApiSummary,
            getDataTypeSafeName: bpMakeJsPath.getDataTypeSafeName,
            getDefaultVerticalName: getDefaultVerticalName,
            hasClientOptions: authMechanisms.includes("SessionTicket"),
            hasServerOptions: authMechanisms.includes("SecretKey"),
            sdkVersion: sdkGlobals.sdkVersion,
            ueTargetVersionMinor: ueTargetVersion.minor, // This is actually used
            ueTargetVersion: ueTargetVersion.targetVersionShort,
            ueTargetVersionLong: ueTargetVersion.targetVersionLong,
            ueWhitelistPlatforms: ueWhitelistPlatforms
        };

        // Copy the resources, content and the .uplugin file
        templatizeTree(locals, path.resolve(sourceDir, "source"), path.resolve(apiOutputDir, "PlayFabPlugin"));

        // Create the Example project folder
        templatizeTree(locals, path.resolve(sourceDir, "examplesource"), apiOutputDir);

        // Copy the PlayFabPlugin folder just created into the ExampleProject
        // TODO: It causes very confusing problems to copy from an output subdir to another output subdir. Let's fix this
        templatizeTree(locals, path.resolve(apiOutputDir, "PlayFabPlugin"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));

        copyFile(path.resolve(sourceDir, "testbuildfiles/PlayFab.Build.cs"), path.resolve(apiOutputDir + "/ExampleProject/Plugins/PlayFab/Source/PlayFab/PlayFab.Build.cs"));
    }
}

// BP Module: Pull all the enums out of all the apis, and collect them into a single collection of just the enum types and filter duplicates
function collectEnumsFromApis(apis) {
    var enumTypes = {};
    for (var a = 0; a < apis.length; a++)
        for (var d in apis[a].datatypes)
            if (apis[a].datatypes[d].isenum && apis[a].datatypes[d].enumvalues.length <= 255)
                enumTypes[d] = apis[a].datatypes[d];
    return enumTypes;
}

function getDefaultVerticalName() {
    if (exports.verticalName) {
        return exports.verticalName;
    }
    return "";
}
