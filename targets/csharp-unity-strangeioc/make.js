var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.putInRoot = true;

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    var baseApiOutputDir = path.resolve(apiOutputDir, "Packages/PlayFabContext/");
    console.log("  - Generating C-sharp Unity StrangeIoC Wrapper client to\n  -> " + baseApiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), baseApiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        makeSignals(apis[i], sourceDir, baseApiOutputDir + "/Signals/");
        makeCommands(apis[i], sourceDir, baseApiOutputDir + "/Commands/");
        makeBindingsFactory(apis[i], sourceDir, baseApiOutputDir + "/Factories/");
        makeContext(apis[i], sourceDir, baseApiOutputDir);
    }
}

function makeSignals(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var apiLocals = { api: api, generateApiSummary: generateApiSummary };
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "strangeioc-playfab-signals.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabSignals.cs"), apiTemplate(apiLocals));
}

function makeCommands(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var apiLocals = { api: api, generateApiSummary: generateApiSummary };
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "strangeioc-playfab-commands.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabCommands.cs"), apiTemplate(apiLocals));
}

function makeContext(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var apiLocals = { api: api, generateApiSummary: generateApiSummary };
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "strangeioc-playfab-context.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabContext.cs"), apiTemplate(apiLocals));
}

function makeBindingsFactory(api, sourceDir, apiOutputDir) {
    var templateDir = path.resolve(sourceDir, "templates");
    var apiLocals = { api: api, generateApiSummary: generateApiSummary };
    var apiTemplate = getCompiledTemplate(path.resolve(templateDir, "strangeioc-playfab-contextbindings.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFabBindingsFactory.cs"), apiTemplate(apiLocals));
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else if (lines.length > 0) {
        output = tabbing + "/// <summary>\n" + tabbing + "/// " + lines.join("\n" + tabbing + "/// ") + "\n" + tabbing + "/// </summary>\n";
    } else {
        output = "";
    }
    return output;
}
