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
    var locals = {
        apis: apis,
        buildIdentifier: exports.buildIdentifier,
        errorList: apis[0].errorList,
        errors: apis[0].errors,
        friendlyName: "PlayFab Python Sdk",
        sdkVersion: exports.sdkVersion,
        //ueTargetVersion: "4.19"
    };

    // Builds the server api.  The provided "apis" variable is a list of objects, built from: API_SPECS/admin.api.json, API_SPECS/matchmaker.api.json, and API_SPECS/server.api.json
    // If you don't want admin, you should filter it out yourself (for now)

    console.log("Generating Server api from: " + sourceDir + " to: " + apiOutputDir);
    templatizeTree(locals, path.resolve(sourceDir, "source"), apiOutputDir); // Copy the whole source directory as-is

    makeDataTypes(apis, sourceDir, apiOutputDir);
    for(var i=0; i< apis.length; i++)
        makeApi(apis[i], sourceDir, apiOutputDir);


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

function makeDataTypes(apis, sourceDir, apiOutputDir) {
    var modelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Model.py.ejs"));
    var modelsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Models.py.ejs"));
    var enumTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Enum.py.ejs"));

    var makeDatatype = function (datatype, api) {
        var modelLocals = {
            api: api,
            datatype: datatype,
            generateApiSummary: generateApiSummary,
            getModelPropertyDef: getModelPropertyDef,
            getPropertyAttribs: getPropertyAttribs,
            getBaseTypeSyntax: getBaseTypeSyntax,
            getDeprecationAttribute: getDeprecationAttribute
        };

        return (datatype.isenum) ? enumTemplate(modelLocals) : modelTemplate(modelLocals);
    };

    for (var a = 0; a < apis.length; a++) {
        var modelsLocal = {
            api: apis[a],
            makeDatatype: makeDatatype
        };

        writeFile(path.resolve(apiOutputDir, "source/PlayFab" + apis[a].name + "Models.py"), modelsTemplate(modelsLocal));
    }
}

function makeApi(api, sourceDir, apiOutputDir) {
    console.log("Generating Python " + api.name + " library to " + apiOutputDir);

    var apiLocals = {
        api: api,
        getAuthParams: getAuthParams,
        getRequestActions: getRequestActions,
        getResultActions: getResultActions,
        getDeprecationAttribute: getDeprecationAttribute,
        generateApiSummary: generateApiSummary,
        authKey: api.name === "Client"
    };

    var apiTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/API.py.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFab" + api.name + "API.py"), apiTemplate(apiLocals));
}

function generateSimpleFiles(apis, sourceDir, apiOutputDir) {
    var errorLocals = {};
    errorLocals.errorList = apis[0].errorList;
    errorLocals.errors = apis[0].errors;

    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/Errors.py.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.py"), errorsTemplate(errorLocals));

    var settingsLocals = {};
    settingsLocals.hasServerOptions = false;
    settingsLocals.hasClientOptions = false;
    settingsLocals.sdkVersion = exports.sdkVersion;
    settingsLocals.buildIdentifier = exports.buildIdentifier;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            settingsLocals.hasClientOptions = true;
        else
            settingsLocals.hasServerOptions = true;
    }

    var utilTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabUtil.py.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabUtil.py"), utilTemplate(settingsLocals));

    var settingsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabSettings.py.ejs"));
    writeFile(path.resolve(apiOutputDir, "source/PlayFabSettings.py"), settingsTemplate(settingsLocals));
}

function getDeprecationAttribute(tabbing, apiObj) {
    var isDeprecated = apiObj.hasOwnProperty("deprecation");
    var deprecationTime = null;
    if (isDeprecated)
        deprecationTime = new Date(apiObj.deprecation.DeprecatedAfter);
    var isError = isDeprecated && (new Date() > deprecationTime) ? "true" : "false";

    if (isDeprecated && apiObj.deprecation.ReplacedBy != null)
        return tabbing + "# [Obsolete(\"Use '" + apiObj.deprecation.ReplacedBy + "' instead\", " + isError + ")]\n";
    else if (isDeprecated)
        return tabbing + "# [Obsolete(\"No longer available\", " + isError + ")]\n";
    return "";
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "# <summary>\n" + tabbing + "# " + lines.join("\n" + tabbing + "# ") + "\n" + tabbing + "# </summary>\n";
    } else if (lines.length > 0) {
        output = tabbing + "# <summary>\n" + tabbing + "# " + lines.join("\n" + tabbing + "# ") + "\n" + tabbing + "# </summary>\n";
    } else {
        output = "";
    }
    return output;

}

function getBaseTypeSyntax(datatype) {
    var parents = [];

    if (datatype.className.toLowerCase().endsWith("request"))
        parents.push("PlayFabRequestCommon");
    if (datatype.className.toLowerCase().endsWith("response") || datatype.className.toLowerCase().endsWith("result"))
        parents.push("PlayFabResultCommon");
    // if (datatype.sortKey) python equivalent would be defining something like def __eq__(self, other) this may not be needed?
    //     parents.push("IComparable<" + datatype.name + ">");

    var output = "";
    if (parents.length > 0) {
        output = " : ";
        for (var i = 0; i < parents.length; i++) {
            if (i !== 0)
                output += ", ";
            output += parents[i];
        }
    }
    return output;
}

function getPropertyAttribs(property, datatype, api) {
    var attribs = "";

    if (property.isUnordered) {
        var listDatatype = api.datatypes[property.actualtype];
        if (listDatatype && listDatatype.sortKey)
            attribs += "# [Unordered(SortProperty=\"" + listDatatype.sortKey + "\")]\n        ";
        else
            attribs += "# [Unordered]\n        ";
    }

    return attribs;
}

function getModelPropertyDef(property, datatype) {
    var basicType;
    if (property.collection) {
        basicType = getPropertyCsType(property, datatype, false);

        if (property.collection === "array")
            return "List<" + basicType + "> " + property.name;
        else if (property.collection === "map")
            return "Dictionary<string," + basicType + "> " + property.name;
        else
            throw "Unknown collection type: " + property.collection + " for " + property.name + " in " + datatype.name;
    }
    else {
        basicType = getPropertyCsType(property, datatype, true);
        return basicType + " " + property.name;
    }
}
