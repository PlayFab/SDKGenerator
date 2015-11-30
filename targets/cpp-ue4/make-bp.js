var path = require("path");
var assert = require("assert");

var makeBP = exports.makeBP = function (api, apiOutputDir, subdir) {
    var sourceDir = __dirname;

    var proxyApiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.h.ejs")));
    var proxyApiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.cpp.ejs")));

    for (var i in api.calls) {
        var apiCall = api.calls[i];

        //var datatype = api.datatypes[i];

        var apiLocals = {};
        apiLocals.api = api;
        apiLocals.apiCall = apiCall;
        apiLocals.hasRequest = hasRequest;
        apiLocals.hasResult = hasResult;
        apiLocals.getDatatypeSignatureInputParameters = getDatatypeSignatureInputParameters;
        apiLocals.generateProxyPropertyCopy = generateProxyPropertyCopy;

        var generatedHeader = proxyApiHeaderTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "Public/" + subdir + api.name +"/" + "PF" + api.name + apiCall.name + ".h"), generatedHeader);

        var generatedBody = proxyApiBodyTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + api.name + "/" + "PF" + api.name + apiCall.name + ".cpp"), generatedBody);
    }

    // generate BP library
    generateBPLibrary(api, apiOutputDir, subdir);

    // generate BP data models
    generateBPDataModels(api, apiOutputDir, subdir);
}

var makeBPAll = exports.makeBPAll = function (apis, apiOutputDir, subdir)
{
    var sourceDir = __dirname;

    var mergedDataTypes = {};
    mergeDatatypes(apis, mergedDataTypes);
}

var generateBPDataModels = exports.generateBPDataModels = function (api, apiOutputDir, subdir)
{
    var sourceDir = __dirname;

    var proxyBpModelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyDataModelsAPI.h.ejs")));

    var bpModelsLocal = {};
    bpModelsLocal.api = api;

    var generatedBpHeader = proxyBpModelHeaderTemplate(bpModelsLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPDataModels.h"), generatedBpHeader);
}

var generateBPLibrary = exports.generateBPLibrary = function (api, apiOutputDir, subdir)
{
    var sourceDir = __dirname;

    var bpLibraryLocal = {};
    bpLibraryLocal.api = api;
    //bpLibraryLocal.getResponseSignatureParameters = getResponseSignatureParameters;
    bpLibraryLocal.getDatatypeSignatureParameters = getDatatypeSignatureParameters;
    bpLibraryLocal.generateProxyPropertyRead = generateProxyPropertyRead;

    var proxyBpLibraryHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.h.ejs")));
    var proxyBpLibraryBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.cpp.ejs")));

    var generatedBpHeader = proxyBpLibraryHeaderTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.h"), generatedBpHeader);

    var generatedBpBody = proxyBpLibraryBodyTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.cpp"), generatedBpBody);
}




// merge data types for all API
var mergeDatatypes = function (apis, outDatatypes)
{
    for (var apiIndex in apis) {
        var api = apis[apiIndex];

        for (var dataTypeIndex in api.datatypes) {

            var datatype = api.datatypes[dataTypeIndex];

            if (outDatatypes.hasOwnProperty(dataTypeIndex) === false) {
                // assign
                outDatatypes[dataTypeIndex] = datatype;
            }
            else {
                // just to make sure, deep compare
                assert.deepEqual(outDatatypes[dataTypeIndex], datatype);
            }
        }
    }
}

var hasResult = exports.hasResult = function (apiCall, api) {
    var requestType = api.datatypes[apiCall.result];
    return requestType.properties.length > 0;
}

var hasRequest = exports.hasRequest = function (apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

var getDatatypeSignatureInputParameters = exports.getDatatypeSignatureInputParameters = function (apiCall, api) {
    var result = "";

    if (hasRequest(apiCall, api) === false) {
        return result;
    }

    var datatype = api.datatypes[apiCall.request];

    for (var p in datatype.properties) {
        var property = datatype.properties[p];

        if (property.isenum || property.actualtype === "object") {
        // TODO: handle enum properly
        }
        else {
            result += ", const " + getBPPropertyDefinition(property, api) + "& In" + property.name;
        }
    }

    return result;
}




var getDatatypeSignatureParameters = exports.getDatatypeSignatureParameters = function (datatype, api)
{
    var result = "";

    for (var p in datatype.properties) {
        var property = datatype.properties[p];

        if (property.isenum || property.actualtype === "object") {
            // TODO: handle enum properly
        }
        else if (property.collection === "map") {
            // TODO: handle map properly
        }
        else {
            result += "        ," + getBPPropertyDefinition(property, api) + "& Out" + property.name + "\n";
        }
    }

    return result;
}



var getResponseSignatureParameters = exports.getResponseSignatureParameters = function(apiCall, api)
{
    var resultType = api.datatypes[apiCall.result];
    var dataType = api.datatypes[resultType.name];

    var result = "";

    for (var p in dataType.properties) {
        var property = dataType.properties[p];
        result += "        ," + getBPPropertyDefinition(property, api) + "& Out" + property.name + "\n";
    }

    return result;
}




var generateArrayClassProxyRead = function (property, api) {

    var inValue = "In.Data." + property.name;

    var result = "";
    result += "for (const " + getProperyUE4ToNativeType(property, api) + "& elem : " + inValue + ")\n";
    result += "    {\n";
    if (!property.isclass) {
        result += "        Out" + property.name + ".Add(static_cast<" + property.actualtype + ">(elem));\n";
    }
    else {
        result += "        "+ getPropertyUE4ToOpaqueType(property, api) + " result;\n";
        result += "        "+ "result.Data = elem;\n";
        result += "        Out" + property.name + ".Add(result);\n";
    }
    result += "    }\n";
    return result;
}


var generateProxyPropertyRead = exports.generateProxyPropertyRead = function (property, api)
{
    // handle optional classes
    // should this return the pointer instead?
    if (property.isclass && property.optional && !property.collection) {
        var result = "";
        result += "if (In.Data." + property.name + ".IsValid()) {";
        result += "    "+ "Out" + property.name + ".Data = *In.Data."+ property.name+";";
        result += "}";
        return result;
    }

    if (property.collection === "array" && (property.isclass || property.actualtype === "uint64")) {
        return generateArrayClassProxyRead(property, api);
    }
    else if (property.collection === "map") {
        //return "TMap<FString, " + getProperyUE4Type(property, api) + ">";
        return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    }
    else if (property.actualtype === "DateTime") {
        return ""; // TODO: handle DateTime properly
    }
    else if (property.isenum) {
        return ""; // TODO: handle enums properly
    }
    else if (property.actualtype === "object") {
        return ""; // TODO: handle FMultiVar properly
    }

    var result = "Out" + property.name + " = In.Data." + property.name + ";";
    return result;
}



//////////////////////////////////////////////////////////////////////////
// generate opaque type

var generateArrayClassProxyCopy = function (property, api) {
    var inValue = "In" + property.name;

    var result = "";
    result += "for (const " + getPropertyUE4ToOpaqueType(property, api) + "& elem : " + inValue + ")\n";
    result += "    {\n";
    if (!property.isclass) {
        result += "        Proxy->Request." + property.name + ".Add(static_cast<" + property.actualtype + ">(elem));\n";
    }
    else {
        result += "        Proxy->Request." + property.name + ".Add(elem.Data);\n";
    }
    result += "    }\n";
    return result;
}

var generateProxyPropertyCopy = exports.generateProxyPropertyCopy = function (property, api)
{

    if (property.collection === "array" && (property.isclass || property.actualtype === "uint64")) {
        return generateArrayClassProxyCopy(property, api);
    }
    else if (property.collection === "map") {
        //return "TMap<FString, " + getProperyUE4Type(property, api) + ">";
        return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    }
    else if (property.actualtype === "DateTime") {
        return ""; // TODO: handle DateTime properly
    }
    else if (property.isenum) {
        return ""; // TODO: handle enums properly
    }
    else if (property.actualtype === "object") {
        return ""; // TODO: handle FMultiVar properly
    }




    var result = "Proxy->Request." + property.name + " = In" + property.name + ";";

    return result;
}


var getBPPropertyDefinition = function (property, api)
{
    if (property.collection === "array") {
        return "TArray<" + getPropertyUE4ToOpaqueType(property, api) + ">";
    }
    else if (property.collection === "map") {
        //return "TMap<FString, " + getProperyUE4Type(property, api) + ">";
        //return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    }

    return getPropertyUE4ToOpaqueType(property, api);
}


var getPropertyUE4ToOpaqueType = function (property, api)
{
    var propertyUE4Type = "";

    if (property.actualtype === "String") {
        propertyUE4Type = "FString";
    }
    else if (property.actualtype === "Boolean") {
        propertyUE4Type = "bool";
    }
    else if (property.actualtype === "int16") {
        propertyUE4Type = "int32";
    }
    else if (property.actualtype === "uint16") {
        propertyUE4Type = "uint32";
    }
    else if (property.actualtype === "int32") {
        propertyUE4Type = "int32";
    }
    else if (property.actualtype === "uint32") {
        propertyUE4Type = "int32"; // uint32 not supported in BP
    }
    else if (property.actualtype === "int64") {
        propertyUE4Type = "int32"; // int64 not supported in BP
    }
    else if (property.actualtype === "uint64") {
        propertyUE4Type = "int32"; // uint64 not supported in BP
    }
    else if (property.actualtype === "float") {
        propertyUE4Type = "float";
    }
    else if (property.actualtype === "double") {
        propertyUE4Type = "float"; // double not supported in BP
    }
    else if (property.actualtype === "DateTime") {
        propertyUE4Type = "FDateTime";
    }
    else if (property.isclass) {
        propertyUE4Type = "FBP" + api.name + property.actualtype;
    }
    else if (property.isenum) {
        propertyUE4Type = property.actualtype;
    }
    else if (property.actualtype === "object") {
        propertyUE4Type = "FMultitypeVar";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    return propertyUE4Type;


}

var getProperyUE4ToNativeType = function (property, api) {
    var propertyUE4Type = "";

    if (property.actualtype === "String") {
        propertyUE4Type = "FString";
    }
    else if (property.actualtype === "Boolean") {
        propertyUE4Type = "bool";
    }
    else if (property.actualtype === "int16") {
        propertyUE4Type = "int32";
    }
    else if (property.actualtype === "uint16") {
        propertyUE4Type = "uint32";
    }
    else if (property.actualtype === "int32") {
        propertyUE4Type = "int32";
    }
    else if (property.actualtype === "uint32") {
        propertyUE4Type = "int32"; // uint32 not supported in BP
    }
    else if (property.actualtype === "int64") {
        propertyUE4Type = "int32"; // int64 not supported in BP
    }
    else if (property.actualtype === "uint64") {
        propertyUE4Type = "int32"; // uint64 not supported in BP
    }
    else if (property.actualtype === "float") {
        propertyUE4Type = "float";
    }
    else if (property.actualtype === "double") {
        propertyUE4Type = "float"; // double not supported in BP
    }
    else if (property.actualtype === "DateTime") {
        propertyUE4Type = "FDateTime";
    }
    else if (property.isclass) {
        propertyUE4Type = "PlayFab::"+ api.name+"Models::F" + property.actualtype;
    }
    else if (property.isenum) {
        propertyUE4Type = property.actualtype;
    }
    else if (property.actualtype === "object") {
        propertyUE4Type = "FMultitypeVar";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }

    return propertyUE4Type;
}
