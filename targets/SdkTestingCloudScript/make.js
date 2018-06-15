var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (getApiJson) === "undefined") getApiJson = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating cloudscript-ts Server SDK to " + apiOutputDir);

    // Get only the server api because this is for CloudScript (only has access to serverAPI)
    var apiList = [];
    for (var i = 0; i < apis.length; i++)
        if (apis[i].name === "Server" || apis[i].name === "Entity")
            apiList.push(apis[i]);
    if (apiList.length === 0)
        throw "Could not find Server API";

    // Load PlayStream APIs
    var playStreamEventModels = getApiJson("PlayStreamEventModels");
    // Load API template
    var cloudScriptTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/CloudScript.d.ts.ejs"));
    var playstreamTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayStream.d.ts.ejs"));
    var pkgTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/package.json.ejs"));

    // Generate the api against the template
    var apiLocals = {
        apis: apiList,
        childTypes: playStreamEventModels.ChildTypes,
        parentTypes: playStreamEventModels.ParentTypes,
        sdkVersion: exports.sdkVersion,
        sourceDir: sourceDir,
        makeDatatype: makeDatatype,
        generateApiSummary: generateApiSummary
    };

    // Write out the template
    writeFile(path.resolve(apiOutputDir, "Scripts/typings/PlayFab/CloudScript.d.ts"), cloudScriptTemplate(apiLocals));
    writeFile(path.resolve(apiOutputDir, "Scripts/typings/PlayFab/PlayStream.d.ts"), playstreamTemplate(apiLocals));
    writeFile(path.resolve(apiOutputDir, "package.json"), pkgTemplate(apiLocals));
}

/**
  Handles selecting the correct datatype template to use for a datatype.
  enum, interface
*/
function makeDatatype(tabbing, datatype, sourceDir, extendsFrom) {
    var enumTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Enum.d.ts.ejs"));
    var interfaceTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Interface.d.ts.ejs"));

    var locals = {
        datatype: datatype,
        tabbing: tabbing
    };

    if (datatype.isenum) {
        locals.enumvalues = datatype.enumvalues;
        return enumTemplate(locals);
    } else {
        locals.extendsFrom = extendsFrom;
        locals.properties = datatype.properties;
        locals.generateApiSummary = generateApiSummary;
        locals.getProperty = getProperty;
        return interfaceTemplate(locals);
    }
}

/** Handles generating a property field for inside an interface */
function getProperty(tabbing, property) {

    var type = property.jsontype.toLowerCase();
    if (type === "object")
        type = "any";
    if (property.isenum || property.isclass)
        type = property.actualtype;

    var preColon = property.name + (property.optional ? "?" : "");
    var postColon = type;

    if (property.collection === "map" && type === "string")
        postColon = "{ [key: string]: string | null }";
    else if (property.collection === "map")
        postColon = "{ [key: string]: " + type + " }";
    else if (property.collection === "array")
        postColon += "[]";

    return tabbing + preColon + ": " + postColon + ",\n";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    // FILTERING: Java is very picky about the output
    if (lines) {
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replaceAll("<", "&lt;").replaceAll(">", "&gt;");
            if (lines[i].contains("*/"))
                lines[i] = null;
        }
    }

    var output;
    if (lines.length === 1 && lines[0])
        output = tabbing + "/** " + lines[0] + " */\n";
    else if (lines.length > 1)
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    else
        output = "";
    return output;
}
