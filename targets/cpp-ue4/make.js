
var path = require('path');
var shared = require('./cpp-ue4');
var blueprint = require('./make-bp.js');

var sdkVersion = "1.0.3";

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";
    
    var PluginOutputDir = path.resolve(apiOutputDir, "Plugins");
    var OutputCodeDir = path.resolve(PluginOutputDir, "PlayFab/Source/PlayFab");
    var BlueprintCodeDir = path.resolve(PluginOutputDir, "PlayFab/Source/PlayFabProxy");
    
    console.log("Generating UE4 C++ combined SDK to " + apiOutputDir);
    
    // copy the base plugins files, resource, uplugin, etc
    copyTree(path.resolve(sourceDir, 'Plugins'), PluginOutputDir);
    
    //copyTree(path.resolve(sourceDir, 'UnittestRunner'), path.resolve(apiOutputDir, 'build/VC12/UnittestRunner'));

    for (var i in apis) {
        var api = apis[i];

        shared.makeAPI(api, OutputCodeDir, "Core/");
        
        // generate blueprint boilerplate
        blueprint.makeBP(api, BlueprintCodeDir, "Proxy/");
    }

    shared.generateModels(apis, OutputCodeDir, libname, "Core/");

    shared.generateErrors(apis[0], OutputCodeDir, "Core/");
    generateVersion(apis[0], sourceDir, OutputCodeDir, "Core/");

    // TODO: generate uplugin
    //makeAPIProject(apis, sourceDir, apiOutputDir, libname);

    
    
}

function generateVersion(api, sourceDir, apiOutputDir, subDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/core/PlayFabVersion.cpp.ejs")));

    var versionLocals = {};
    versionLocals.apiRevision = api.revision;
    versionLocals.sdkRevision = sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "Private/"+ subDir +"PlayFabVersion.cpp"), generatedVersion);
}
