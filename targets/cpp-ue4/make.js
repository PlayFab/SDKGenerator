var path = require("path");
var shared = require("./cpp-ue4");
var blueprint = require("./make-bp.js");

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var subFolders = ["PlayFabSDK", "ExampleProject"]// Two copies, one for example project, and one as the raw plugin
    for (i in subFolders) {
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var pluginOutputDir = path.resolve(eachApiOutputDir, "Plugins");
        var outputCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFab");
        var blueprintCodeDir = path.resolve(pluginOutputDir, "PlayFab/Source/PlayFabProxy");
        
        console.log("Generating UE4 C++ combined SDK to " + eachApiOutputDir);
        
        // copy the base plugins files, resource, uplugin, etc
        copyTree(path.resolve(sourceDir, "Plugins"), pluginOutputDir);
        
        for (var i in apis) {
            shared.makeAPI(apis[i], outputCodeDir, "Core/");
            // generate blueprint boilerplate
            blueprint.makeBP(apis[i], blueprintCodeDir, "Proxy/");
        }
        
        shared.generateModels(apis, outputCodeDir, "All", "Core/");
        shared.generateErrors(apis[0], outputCodeDir, "Core/");
        generateVersion(apis[0], sourceDir, outputCodeDir, "Core/");
    }

    copyTree(path.resolve(sourceDir, "testingFiles"), path.resolve(apiOutputDir, "ExampleProject/Source/ExampleProject"));
}

function generateVersion(api, sourceDir, apiOutputDir, subDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabVersion.cpp.ejs")));
    
    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "Private/" + subDir + "PlayFabVersion.cpp"), generatedVersion);
}
