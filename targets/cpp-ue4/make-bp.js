var path = require("path");
var ejs = require("ejs");

exports.MakeBp = function (api, sourceDir, apiOutputDir, subdir) {
    var proxyApiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.h.ejs")));
    var proxyApiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.cpp.ejs")));
    
    for (var i in api.calls) {
        var apiCall = api.calls[i];
        
        var apiLocals = {};
        apiLocals.api = api;
        apiLocals.apiCall = apiCall;
        apiLocals.HasRequest = HasRequest;
        apiLocals.HasResult = HasResult;
        apiLocals.GetDatatypeSignatureInputParameters = GetDatatypeSignatureInputParameters;
        apiLocals.GenerateProxyPropertyCopy = GenerateProxyPropertyCopy;
        
        var generatedHeader = proxyApiHeaderTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "Public/" + subdir + api.name + "/" + "PF" + api.name + apiCall.name + ".h"), generatedHeader);
        
        var generatedBody = proxyApiBodyTemplate(apiLocals);
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + api.name + "/" + "PF" + api.name + apiCall.name + ".cpp"), generatedBody);
    }
    
    // generate BP library
    GenerateBpLibrary(api, sourceDir, apiOutputDir, subdir);
    
    // generate BP data models
    GenerateBpDataModels(api, sourceDir, apiOutputDir, subdir);
}

function GenerateBpDataModels(api, sourceDir, apiOutputDir, subdir) {
    var proxyBpModelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyDataModelsAPI.h.ejs")));
    
    var bpModelsLocal = {};
    bpModelsLocal.api = api;
    
    var generatedBpHeader = proxyBpModelHeaderTemplate(bpModelsLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPDataModels.h"), generatedBpHeader);
}

function GenerateBpLibrary(api, sourceDir, apiOutputDir, subdir) {
    var bpLibraryLocal = {};
    bpLibraryLocal.api = api;
    bpLibraryLocal.GetDatatypeSignatureParameters = GetDatatypeSignatureParameters;
    bpLibraryLocal.GenerateProxyPropertyRead = GenerateProxyPropertyRead;
    
    var proxyBpLibraryHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.h.ejs")));
    var proxyBpLibraryBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.cpp.ejs")));
    
    var generatedBpHeader = proxyBpLibraryHeaderTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.h"), generatedBpHeader);
    
    var generatedBpBody = proxyBpLibraryBodyTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.cpp"), generatedBpBody);
}

function HasResult(apiCall, api) {
    var requestType = api.datatypes[apiCall.result];
    return requestType.properties.length > 0;
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function GetDatatypeSignatureInputParameters(apiCall, api) {
    var result = "";
    
    if (HasRequest(apiCall, api) === false) {
        return result;
    }
    
    var datatype = api.datatypes[apiCall.request];
    
    for (var p = 0; p < datatype.properties.length; p++) {
        var property = datatype.properties[p];
        
        if (property.isenum || property.actualtype === "object") {
            // TODO: handle enum properly
        }
        else {
            result += ", const " + GetBpPropertyDefinition(property, api) + "& In" + property.name;
        }
    }
    
    return result;
}

function GetDatatypeSignatureParameters(datatype, api) {
    var result = "";
    
    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            
            if (property.isenum || property.actualtype === "object") {
                // TODO: handle enum properly
            } else if (property.collection === "map") {
                // TODO: handle map properly
            } else {
                result += "        ," + GetBpPropertyDefinition(property, api) + "& Out" + property.name + "\n";
            }
        }
    }
    
    return result;
}

function GenerateArrayClassProxyRead(property, api, datatype) {
    
    var inValue = "In.Data." + property.name;
    
    var result = "";
    result += "for (const " + GetProperyUe4ToNativeType(property, api, datatype) + "& elem : " + inValue + ")\n";
    result += "    {\n";
    if (!property.isclass) {
        result += "        Out" + property.name + ".Add(static_cast<" + property.actualtype + ">(elem));\n";
    }
    else {
        result += "        " + GetPropertyUe4ToOpaqueType(property, api, datatype) + " result;\n";
        result += "        " + "result.Data = elem;\n";
        result += "        Out" + property.name + ".Add(result);\n";
    }
    result += "    }\n";
    return result;
}

function GenerateProxyPropertyRead(property, api, datatype) {
    // handle optional classes
    // should this return the pointer instead?
    if (property.isclass && property.optional && !property.collection) {
        var result = "";
        result += "if (In.Data." + property.name + ".IsValid()) {";
        result += "    " + "Out" + property.name + ".Data = *In.Data." + property.name + ";";
        result += "}";
        return result;
    }
    
    if (property.collection === "array" && (property.isclass || property.actualtype === "uint64"))
        return GenerateArrayClassProxyRead(property, api, datatype);
    else if (property.collection === "map")
        return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    else if (property.actualtype === "DateTime")
        return ""; // TODO: handle DateTime properly
    else if (property.isenum)
        return ""; // TODO: handle enums properly
    else if (property.actualtype === "object")
        return ""; // TODO: handle FMultiVar properly
    else if (property.isclass)
        return "Out" + property.name + ".Data = In.Data." + property.name + ";";
    return "Out" + property.name + " = In.Data." + property.name + ";";
}

//////////////////////////////////////////////////////////////////////////
// generate opaque type
function GenerateArrayClassProxyCopy(property, api, datatype) {
    var inValue = "In" + property.name;
    
    var result = "for (const " + GetPropertyUe4ToOpaqueType(property, api, datatype) + "& elem : " + inValue + ")\n";
    result += "    {\n";
    if (!property.isclass)
        result += "        Proxy->Request." + property.name + ".Add(static_cast<" + property.actualtype + ">(elem));\n";
    else
        result += "        Proxy->Request." + property.name + ".Add(elem.Data);\n";
    result += "    }\n";
    return result;
}

function GenerateProxyPropertyCopy(property, api, datatype) {
    if (property.collection === "array" && (property.isclass || property.actualtype === "uint64"))
        return GenerateArrayClassProxyCopy(property, api, datatype);
    else if (property.collection === "map")
        return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    else if (property.actualtype === "DateTime")
        return ""; // TODO: handle DateTime properly
    else if (property.isenum)
        return ""; // TODO: handle enums properly
    else if (property.actualtype === "object")
        return ""; // TODO: handle FMultiVar properly
    else if (property.isclass && property.optional)
        return "*Proxy->Request." + property.name + " = In" + property.name + ".Data;";
    else if (property.isclass)
        return "Proxy->Request." + property.name + " = In" + property.name + ".Data;";
    return "Proxy->Request." + property.name + " = In" + property.name + ";";
}

function GetBpPropertyDefinition(property, api, datatype) {
    if (property.collection === "array") {
        return "TArray<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">";
    }
    else if (property.collection === "map") {
        //return "TMap<FString, " + getProperyUE4Type(property, api) + ">";
        //return ""; // TODO: handle map properly, by wrapping it into a structure somehow
    }
    
    return GetPropertyUe4ToOpaqueType(property, api, datatype);
}

function GetPropertyUe4ToOpaqueType(property, api, datatype) {
    var propertyUe4Type;
    
    if (property.actualtype === "String")
        propertyUe4Type = "FString";
    else if (property.actualtype === "Boolean")
        propertyUe4Type = "bool";
    else if (property.actualtype === "int16")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint16")
        propertyUe4Type = "uint32";
    else if (property.actualtype === "int32")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint32")
        propertyUe4Type = "int32"; // uint32 not supported in BP
    else if (property.actualtype === "int64")
        propertyUe4Type = "int32"; // int64 not supported in BP
    else if (property.actualtype === "uint64")
        propertyUe4Type = "int32"; // uint64 not supported in BP
    else if (property.actualtype === "float")
        propertyUe4Type = "float";
    else if (property.actualtype === "double")
        propertyUe4Type = "float"; // double not supported in BP
    else if (property.actualtype === "DateTime")
        propertyUe4Type = "FDateTime";
    else if (property.isclass)
        propertyUe4Type = "FBP" + api.name + property.actualtype;
    else if (property.isenum)
        propertyUe4Type = property.actualtype;
    else if (property.actualtype === "object")
        propertyUe4Type = "FMultitypeVar";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    
    return propertyUe4Type;
}

function GetProperyUe4ToNativeType(property, api, datatype) {
    var propertyUe4Type;
    
    if (property.actualtype === "String")
        propertyUe4Type = "FString";
    else if (property.actualtype === "Boolean")
        propertyUe4Type = "bool";
    else if (property.actualtype === "int16")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint16")
        propertyUe4Type = "uint32";
    else if (property.actualtype === "int32")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint32")
        propertyUe4Type = "int32"; // uint32 not supported in BP
    else if (property.actualtype === "int64")
        propertyUe4Type = "int32"; // int64 not supported in BP
    else if (property.actualtype === "uint64")
        propertyUe4Type = "int32"; // uint64 not supported in BP
    else if (property.actualtype === "float")
        propertyUe4Type = "float";
    else if (property.actualtype === "double")
        propertyUe4Type = "float"; // double not supported in BP
    else if (property.actualtype === "DateTime")
        propertyUe4Type = "FDateTime";
    else if (property.isclass)
        propertyUe4Type = "PlayFab::" + api.name + "Models::F" + property.actualtype;
    else if (property.isenum)
        propertyUe4Type = property.actualtype;
    else if (property.actualtype === "object")
        propertyUe4Type = "FMultitypeVar";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    
    return propertyUe4Type;
}
