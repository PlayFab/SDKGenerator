var path = require("path");

exports.putInRoot = true;

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating cloudscript-ts Server SDK to " + apiOutputDir);
    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    
    // Get only the server api because this is for CloudScript (only has access to serverAPI)
    var serverApi = null;
    for (var i = 0; i < apis.length; i++)
        if (apis[i].name === "Server")
            serverApi = apis[i];
    if (!serverApi)
        throw "Could not find Server API";
    console.log("Test api is: " + serverApi.name);
    
    // Load PlayStream APIs
    var playStreamEventModels = GetApiJson("PlayStreamEventModels.json");
    // Load API template
    var cloudScriptTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/CloudScript.d.ts.ejs"));
    var playstreamTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/PlayStream.d.ts.ejs"));
    var pkgTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/package.json.ejs"));
    
    // Generate the api against the template
    var apiLocals = {
        api: serverApi,
        childTypes: playStreamEventModels.ChildTypes,
        parentTypes: playStreamEventModels.ParentTypes,
        sdkVersion: exports.sdkVersion,
        sourceDir: sourceDir,
        MakeDatatype: MakeDatatype,
        GenerateApiSummary: GenerateApiSummary
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
function MakeDatatype(tabbing, datatype, sourceDir, extendsFrom) {
    var enumTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Enum.d.ts.ejs"));
    var interfaceTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Interface.d.ts.ejs"));
    
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
        locals.GenerateApiSummary = GenerateApiSummary;
        locals.GetProperty = GetProperty;
        return interfaceTemplate(locals);
    }
}

/** Handles generating a property field for inside an interface */
function GetProperty(tabbing, property) {
    
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
        postColon = "{ [key: string]: " + type + " }"; // TODO: handle { [key: string]: string | null }
    }
    if (property.collection === "array") {
        postColon += "[]";
    }
    
    return tabbing + preColon + ": " + postColon + ",\n";
}

function GenerateApiSummary(tabbing, apiElement, summaryParam, extraLine) {
    var fullSummary;
    if (!apiElement.hasOwnProperty(summaryParam))
        fullSummary = "";
    else
        fullSummary = apiElement[summaryParam];
    
    var prettyDescription = PrettifyDescriptionText(fullSummary);
    if (extraLine)
        prettyDescription.push(extraLine);
    
    if (prettyDescription.length < 1) {
        return "";
    } else if (prettyDescription.length > 1) {
        return tabbing + "/** \n" + tabbing + " * " + prettyDescription.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else { // prettyDescription.length === 1
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
    var eachLine = "";
    textArray = textArray || [];
    
    if (text == null)
        return textArray;
    
    // If last bit of text just add it to list.
    if (text.length <= lineLength) {
        eachLine = text.trim();
        if (eachLine)
            textArray.push(eachLine);
        return textArray;
    }
    
    // Get substring the at max eachLine break length
    eachLine = text.substring(0, lineLength);
    
    // Search for the last spaces in the max eachLine break substring for nicer lines
    var lastSpaceRgx = /\s(?!.*\s)/;
    var index = eachLine.search(lastSpaceRgx);
    var nextIndex = lineLength;
    if (index > 0) {
        eachLine = eachLine.substring(0, index);
        nextIndex = index;
    }
    
    eachLine = eachLine.trim();
    if (eachLine)
        textArray.push(eachLine);
    return FoldDescription(text.substring(nextIndex), textArray);
}
