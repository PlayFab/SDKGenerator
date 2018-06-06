var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

// generate.js looks for some specific exported functions in make.js, like:
exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    // Builds the client api.  The provided "api" variable is a single object, the API_SPECS/client.api.json as an object
    console.log("Generating Client api from: " + sourceDir + " to: " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is
    MakeExampleTemplateFile(sourceDir, apiOutputDir);
}


// generate.js looks for some specific exported functions in make.js, like:
exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    // Builds the server api.  The provided "apis" variable is a list of objects, built from: API_SPECS/admin.api.json, API_SPECS/matchmaker.api.json, and API_SPECS/server.api.json
    // If you don't want admin, you should filter it out yourself (for now)

    console.log("Generating Server api from: " + sourceDir + " to: " + apiOutputDir);
    templatizeTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is

    MakeExampleTemplateFile(sourceDir, apiOutputDir);
}

// generate.js looks for some specific exported functions in make.js, like:
exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    // Builds every api.  The provided "apis" variable is a list of objects, built from: API_SPECS/admin.api.json, API_SPECS/matchmaker.api.json, API_SPECS/server.api.json, and API_SPECS/client.api.json
    console.log("Generating Combined api from: " + sourceDir + " to: " + apiOutputDir);
    templatizeTree(path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is
    MakeExampleTemplateFile(sourceDir, apiOutputDir);
}

// Unlike source, Templates are written one file at a time.
// You may want to write a helper function to write each template file, so you can call it from multiple places
function MakeExampleTemplateFile(sourceDir, apiOutputDir) {
    // Each template must be given any variables/information that it needs for generation.
    // This might include apis, datatypes, custom functions defined in this make.js file, or anything else you want
    var locals = {};

    locals.GeneratedText = "This is generated text"; // A specific variable we wish to access in exampleTemplate.txt.ejs
    locals.sdkVersion = exports.sdkVersion; // exports.sdkVersion is automatically injected into this file from generate.js, and comes from SdkManualNotes.json - you must provide your target in that file

    // Compiles the source .ejs file into a template function.
    var template = getCompiledTemplate(path.resolve(sourceDir, "templates/exampleTemplate.txt.ejs"));

    // Call the template function, which executes the template, and evaluates all the ejs tags/logic
    var generatedTemplateText = template(locals);

    // generatedTemplateText is an in-memory string of the output file.  At this point, you just write it to the destination:
    writeFile(path.resolve(apiOutputDir, "exampleTemplate.txt"), generatedTemplateText);
}
