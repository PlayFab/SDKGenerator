var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating cloudscript-ts Server SDK to " + apiOutputDir);
    
    
    // Get only the server api because this is for CloudScript (only has access to serverAPI)
    var serverApi = null;
    for (var i = 0; i < apis.length; i++)
        if (apis[i].name === "Server")
            serverApi = apis[i];
    if (!serverApi)
        throw "Could not find Server API";
    console.log("Test api is: " + serverApi.name);
    
    // Load API template
    var apiTemplate = CompileTemplate(sourceDir, "API");
    
    // Generate the api against the template
    var apiLocals = {
        api : serverApi,
        sourceDir: sourceDir,
        MakeDatatype: MakeDatatype,
        GetDescription: GetDescription
    };
    var generatedApi = apiTemplate(apiLocals);
    
    // Write out the template
    var outputDir = path.resolve(apiOutputDir, "src/typings");
    writeFile(path.resolve(outputDir, "CloudScript.d.ts"), generatedApi);
}

/**
  Handles selecting the correct datatype template to use for a datatype.
  enum, interface
*/
function MakeDatatype(datatype, api, sourceDir, tabbing) {
    var stringLiteralTemplate = CompileTemplate(sourceDir, "StringLiteral");
    var interfaceTemplate = CompileTemplate(sourceDir, "Interface");
    
    var locals = {
        name: datatype.name,
        tabbing: tabbing
    };
    
    if (datatype.isenum) {
        locals.enumvalues = datatype.enumvalues;
        return GetDescription(datatype.description, tabbing) + stringLiteralTemplate(locals);
    } else {
        locals.properties = datatype.properties;
        locals.sourceDir = sourceDir;
        locals.api = api;
        locals.GetProperty = GetProperty;
        return GetDescription(datatype.description, tabbing) + interfaceTemplate(locals);
    }
}

/** Handles generating a property field for inside an interface */
function GetProperty(property, tabbing) {
    
    var type = property.jsontype.toLowerCase();
    if (type === "object") {
        type = "any";
    }
    if (property.isenum || property.isclass) {
        type = property.actualtype;
    }
    
    var preColon = property.name + (property.optional ? "?" : "");
    var postColon = type;
    
    if (property.collection === "map") {
        postColon = "{ [key: string]: " + type + " }";
    }
    if (property.collection === "array") {
        postColon += "[]";
    }
    
    return GetDescription(property.description, tabbing) + tabbing + preColon + ": " + postColon + ",\n";
}

function GetDescription(rawDescription, tabbing) {
    var prettyDescription = PrettifyDescriptionText(rawDescription);
    
    if (prettyDescription.length < 1) {
        return "";
    }
    else if (prettyDescription.length > 1) {
        return tabbing + "/** \n" + tabbing + " * " + prettyDescription.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    }
    else { // prettyDescription.length === 1
        return tabbing + "/** " + prettyDescription[0] + " */\n";
    }
}

/**
  Inserts newlines every 80 characters in description text.
  This helps accomadate tools such as atom-typescript
*/
function PrettifyDescriptionText(descriptionText) {
    return FoldDescription(descriptionText);
}


/** Recursive function used to break up description into list of lines */
function FoldDescription(text, textArray) {
    var lineLength = 80;
    textArray = textArray || [];
    
    if (text == null) {
        return textArray;
    }
    
    // If last bit of text just add it to list.
    if (text.length <= lineLength) {
        textArray.push(text.trim());
        return textArray;
    }
    
    // Get substring the at max line break length
    var line = text.substring(0, lineLength);
    
    // Search for the last spaces in the max line break substring for nicer lines
    var lastSpaceRgx = /\s(?!.*\s)/;
    var index = line.search(lastSpaceRgx);
    var nextIndex = lineLength;
    if (index > 0) {
        line = line.substring(0, index);
        nextIndex = index;
    }
    
    textArray.push(line.trim());
    return FoldDescription(text.substring(nextIndex), textArray);
}

/** Wrapper function for boilerplate of compiling templates */
function CompileTemplate(sourceDir, templateName) {
    if (!this.compiledTemplates) {
        this.compiledTemplates = {};
    }
    
    if (!compiledTemplates.hasOwnProperty(templateName)) {
        var templateDir = path.resolve(sourceDir, "templates");
        var filename = templateName + ".d.ts.ejs";
        this.compiledTemplates[templateName] = ejs.compile(readFile(path.resolve(templateDir, filename)));
    }
    return this.compiledTemplates[templateName];
}
