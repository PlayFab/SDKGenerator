
var path = require('path');
var shared = require('./cpp-ue4');
var blueprint = require('./make-bp.js');

exports.putInRoot = true;

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var subFolders = ["PlayFabSDK", "ExampleProject"] // Two copies, one for example project, and one as the raw plugin
    for (i in subFolders) {
        var eachApiOutputDir = path.resolve(apiOutputDir, subFolders[i]);
        var libname = "All";
        
        var PluginOutputDir = path.resolve(eachApiOutputDir, "Plugins");
        var OutputCodeDir = path.resolve(PluginOutputDir, "PlayFab/Source/PlayFab");
        var BlueprintCodeDir = path.resolve(PluginOutputDir, "PlayFab/Source/PlayFabProxy");
        
        console.log("Generating UE4 C++ combined SDK to " + eachApiOutputDir);
        
        // copy the base plugins files, resource, uplugin, etc
        copyTree(path.resolve(sourceDir, 'Plugins'), PluginOutputDir);
        
        for (var i in apis) {
            var api = apis[i];
            
            shared.makeAPI(api, OutputCodeDir, "Core/");
            
            // generate blueprint boilerplate
            blueprint.makeBP(api, BlueprintCodeDir, "Proxy/");
        }
        
        shared.generateModels(apis, OutputCodeDir, libname, "Core/");
        
        shared.generateErrors(apis[0], OutputCodeDir, "Core/");
        generateVersion(apis[0], sourceDir, OutputCodeDir, "Core/");
    }
}

function generateVersion(api, sourceDir, apiOutputDir, subDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabVersion.cpp.ejs")));

    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "Private/"+ subDir +"PlayFabVersion.cpp"), generatedVersion);
}
