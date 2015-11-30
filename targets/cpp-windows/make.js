var path = require("path");
var shared = require("../cpp-shared/cpp-shared");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    var libname = "Client";

    console.log("Generating Windows C++ client SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "../cpp-shared/source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);

    shared.makeAPI(api, apiOutputDir, "core/");

    shared.generateModels([api], apiOutputDir, libname, "core/");

    shared.generateErrors(api, apiOutputDir);
    generateVersion(api, sourceDir, apiOutputDir);

    makeAPIProject([api], sourceDir, apiOutputDir, libname);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "Server";

    console.log("Generating Windows C++ server SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "../cpp-shared/source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);

    for (var i in apis) {
        var api = apis[i];

        shared.makeAPI(api, apiOutputDir, "core/");
    }

    shared.generateModels(apis, apiOutputDir, libname, "core/");

    shared.generateErrors(apis[0], apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);

    makeAPIProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    var libname = "All";

    console.log("Generating Windows C++ combined SDK to " + apiOutputDir);

    copyTree(path.resolve(sourceDir, "../cpp-shared/source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    copyTree(path.resolve(sourceDir, "UnittestRunner"), path.resolve(apiOutputDir, "build/VC12/UnittestRunner"));

    for (var i in apis) {
        var api = apis[i];

        shared.makeAPI(api, apiOutputDir, "core/");
    }

    shared.generateModels(apis, apiOutputDir, libname, "core/");

    shared.generateErrors(apis[0], apiOutputDir);
    generateVersion(apis[0], sourceDir, apiOutputDir);

    makeAPIProject(apis, sourceDir, apiOutputDir, libname);
}


function makeAPIProject(apis, sourceDir, apiOutputDir, libname) {
    var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.vcxproj.ejs")));
    var vcProjFilterTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.vcxproj.filters.ejs")));

    var projLocals = {};
    projLocals.apis = apis;
    projLocals.libname = libname;

    var generatedProject = vcProjTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "build/VC12/PlayFabAPI/PlayFabAPI.vcxproj"), generatedProject);

    var generatedFilters = vcProjFilterTemplate(projLocals);
    writeFile(path.resolve(apiOutputDir, "build/VC12/PlayFabAPI/PlayFabAPI.vcxproj.filters"), generatedFilters);
}


function generateVersion(api, sourceDir, apiOutputDir) {
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cpp.ejs")));

    var versionLocals = {};
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "source/core/PlayFabVersion.cpp"), generatedVersion);
}
