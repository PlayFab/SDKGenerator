var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };

var maxEnumSize = 255;

exports.makeCommonCombinedAPI = function (apis, copyright, sourceDir, apiOutputDir, ueTargetVersion, sdkVersion, buildIdentifier) {
    var locals = {
        apis: apis,
        buildIdentifier: buildIdentifier,
        copyright: copyright,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        friendlyName: "PlayFab Common Module",
        sdkVersion: sdkVersion,
        ueTargetVersion: ueTargetVersion
    };

    var subFolders = ["PlayFabPlugin"]; // Raw plugin folder
    for (var i = 0; i < subFolders.length; i++) {
        var sourceCodeDir = path.resolve(sourceDir, "source/PlayFab/Source/PlayFabCommon");
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var outputCodeDir = path.resolve(eachApiOutputDir, "PlayFab/Source/PlayFabCommon");

        console.log("Generating UE4 Common module" + eachApiOutputDir);

        console.log("Source : " + sourceCodeDir + " ");

        // copy the base plugins files, resource, uplugin, etc
        templatizeTree(locals, sourceCodeDir, outputCodeDir);
    }
}

function addTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet) {
    if (datatype.isenum && datatype.enumvalues.length > maxEnumSize)
        return; // Enums are basically strings under the hood, and Unreal doesn't support that many enum values, so just fall back on Strings

    if (addedSet[datatype.name])
        return;

    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            if (property.isclass || property.isenum)
                addTypeAndDependencies(datatypes[property.actualtype], datatypes, orderedTypes, addedSet);
        }
    }

    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}