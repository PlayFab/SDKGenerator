var path = require("path");
var ejs = require("ejs");

exports.putInRoot = true;

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating cloudscript-ts Server SDK to " + apiOutputDir);


    //Get only the server api because this is for CloudScript (only has access to serverAPI)
    var serverAPI = apis.filter(api => api.name == 'Server')[0];
    console.log("Test api is: " + serverAPI.name)

    //Load API template
    var apiTemplate = compileTemplate(sourceDir,"API");

    //Generate the api against the template
    var apiLocals = {
      api : serverAPI,
      sourceDir: sourceDir,
      MakeDatatype: MakeDatatype
    };
    var generatedApi = apiTemplate(apiLocals);

    //Write out the template
    var outputDir = path.resolve(apiOutputDir, "PlayFabSdk");
    writeFile(path.resolve(outputDir, "CloudScript.d.ts"), generatedApi);

}

/**
  Handles selecting the correct datatype template to use for a datatype.
  enum, interface
*/
function MakeDatatype(datatype, api, sourceDir) {
  var stringLiteralTemplate = compileTemplate(sourceDir,"StringLiteral");
  var interfaceTemplate = compileTemplate(sourceDir,"Interface");

  var locals = {
    name: datatype.name,
    description: prettifyDescriptionText(datatype.description)
  };

  if(datatype.isenum) {
    locals.enumvalues = datatype.enumvalues;
    return stringLiteralTemplate(locals);
  }
  else {
    locals.properties = datatype.properties;
    locals.sourceDir = sourceDir;
    locals.api = api;
    locals.MakeProperty = MakeProperty;
    return interfaceTemplate(locals);
  }

}

/**
  Handles selecting the correct property template to use for an interface property
  normal, array, map
 */
function MakeProperty(property, api, sourceDir) {
  var propertyTemplate = compileTemplate(sourceDir, "Property");
  var arrayPropertyTemplate = compileTemplate(sourceDir, "ArrayProperty");
  var mapPropertyTemplate = compileTemplate(sourceDir, "MapProperty");

  var locals = {
    name: property.name,
    optionalStr: "",
    typeStr: property.jsontype.toLowerCase(),
    description: prettifyDescriptionText(property.description)
  };

  if(property.optional)
    locals.optionalStr = "?";

  if(locals.typeStr === "object")
    locals.typeStr = "any";
  if(property.isenum || property.isclass)
    locals.typeStr = property.actualtype;


  switch(property.collection) {
    case "array":
      return arrayPropertyTemplate(locals);
    case "map":
      return mapPropertyTemplate(locals);
    default:
      return propertyTemplate(locals);
  }

}

/**
  Inserts newlines every 80 characters in description text.
  This helps accomadate tools such as atom-typescript
*/
function prettifyDescriptionText(descriptionText) {
  return foldDescription(descriptionText);
}

function foldDescription(text, textArray) {
  var lineLength = 80;
  textArray = textArray || [];

  if(text == null) {
    return textArray;
  }

  //If less then lineLength of characters add to array and return done splitting
  if(text.length <= lineLength) {
    textArray.push(text);
    return textArray;
  }
  var line = text.substring(0, lineLength);

  //Look for spaces in the line substring for better line breaks
  var lastSpaceRgx = /\s(?!.*\s)/;
  var index = line.search(lastSpaceRgx)
  var nextIndex = lineLength;
  if(index > 0) {
    line = line.substring(0,index);
    nextIndex = index;
  }

  textArray.push(line);
  return foldDescription(text.substring(nextIndex), textArray)
}



/** Wrapper function for boilerplate of compiling templates */
function compileTemplate(sourceDir, templateName) {
  var templateDir = path.resolve(sourceDir, "templates")
  var filename = templateName+".d.ts.ejs";
  return ejs.compile(readFile(path.resolve(templateDir, filename)));
}
