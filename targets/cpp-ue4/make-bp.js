var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.MakeBp = function (api, sourceDir, apiOutputDir, subdir) {
    // generate BP proxy
    generateBpProxy(api, sourceDir, apiOutputDir, subdir);

    // generate BP library
    generateBpLibrary(api, sourceDir, apiOutputDir, subdir);

    // generate BP data models
    generateBpDataModels(api, sourceDir, apiOutputDir, subdir);
}

function generateBpProxy(api, sourceDir, apiOutputDir, subdir) {
    for (var i = 0; i < api.calls.length; i++) {
        var apiLocals = {
            api: api,
            apiCall: api.calls[i],
            hasRequest: hasRequest,
            hasResult: hasResult,
            getDatatypeSignatureInputParameters: getDatatypeSignatureInputParameters
        };

        var proxyApiHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.h.ejs"));
        writeFile(path.resolve(apiOutputDir, "Public/" + subdir + api.name + "/PF" + api.name + api.calls[i].name + ".h"), proxyApiHeaderTemplate(apiLocals));

        var proxyApiBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.cpp.ejs"));
        writeFile(path.resolve(apiOutputDir, "Private/" + subdir + api.name + "/PF" + api.name + api.calls[i].name + ".cpp"), proxyApiBodyTemplate(apiLocals));
    }
}

function generateBpLibrary(api, sourceDir, apiOutputDir, subdir) {
    var bpLibraryLocal = {
        api: api,
        getDatatypeSignatureParameters: getDatatypeSignatureParameters,
        generateProxyPropertyWrite: generateProxyPropertyWrite,
        generateProxyPropertyRead: generateProxyPropertyRead,
        isRequest: isRequest,
        isResult: isResult
    };

    var proxyBpLibraryHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFab_BPLibrary.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/PlayFab" + api.name + "BPLibrary.h"), proxyBpLibraryHeaderTemplate(bpLibraryLocal));

    var proxyBpLibraryBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFab_BPLibrary.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "/PlayFab" + api.name + "BPLibrary.cpp"), proxyBpLibraryBodyTemplate(bpLibraryLocal));
}

function generateBpDataModels(api, sourceDir, apiOutputDir, subdir) {
    var bpModelsLocal = {
        api: api,
        needsDelegate: needsDelegate,
        isRequest: isRequest,
        isResult: isResult
    };

    var proxyBpModelHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFab_BPDataModels.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/PlayFab" + api.name + "BPDataModels.h"), proxyBpModelHeaderTemplate(bpModelsLocal));
}

function needsDelegate(name) {
    return isResult(name);
}

function isRequest(name) {
    return name.indexOf("Request") > -1;
}

function isResult(name) {
    return name.indexOf("Result") > -1 || name.indexOf("Response") > -1; // PlayFab should decide if they want it to be "Response" or "Result" ffs
}

function hasRequest(apiCall, api) {
    return api.datatypes[apiCall.request].properties.length > 0;
}

function hasResult(apiCall, api) {
    return api.datatypes[apiCall.result].properties.length > 0;
}

function getPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function getDatatypeSignatureInputParameters(apiCall, api) {
    var result = "";
    if (hasRequest(apiCall, api) === false)
        return result;

    var datatype = api.datatypes[apiCall.request];

    return ", const FBP" + api.name + datatype.name + "& In" + datatype.name;
}

function getDatatypeSignatureParameters(tabbing, datatype, api, make) {
    var result = "";

    if (!datatype.properties)
        return result;

    var makeCount = 0;
    for (var p = 0; p < datatype.properties.length; p++) {
        var property = datatype.properties[p];

        if (property.name === "TitleId") // TitleId is set via PlayFab project settings
            continue;

        if (make) {
            makeCount = makeCount + 1;
            result += tabbing;
            if (makeCount !== 1)
                result += ", ";
            result += getBpPropertyDefinition(property, api) + " In" + property.name + "\n";
        } else {
            result += tabbing + ", " + getBpPropertyDefinition(property, api) + "& Out" + property.name + "\n";
        }
    }

    return result;
}

///////////////////
// Write properties
function generateMapClassProxyWrite(tabbing, property, api, datatype) {
    var safePropName = getPropertySafeName(property);
    var inValue = "In" + property.name;

    var result = tabbing + "for (auto& elem : " + inValue + ")\n";
    result += tabbing + "{\n";
    result += tabbing + "    const " + getPropertyUe4ToOpaqueType(property, api, datatype) + " value = elem.Value;\n";
    if (property.isenum)
        result += tabbing + "    Out.Data." + safePropName + ".Add(elem.Key, static_cast<" + getProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(value)));\n";
    else if (property.isclass)
        result += tabbing + "    Out.Data." + safePropName + ".Add(elem.Key, value.Data);\n";
    else if (property.actualtype === "object")
        result += tabbing + "    Out.Data." + safePropName + ".Add(elem.Key, value->GetRootValue());\n";
    else // should really only be number types
        result += tabbing + "    Out.Data." + safePropName + ".Add(elem.Key, static_cast<" + getProperyUe4ToNativeType(property, api, datatype) + ">(value));\n";
    result += tabbing + "}\n";
    return result;
}

function generateArrayClassProxyWrite(tabbing, property, api, datatype) {
    var safePropName = getPropertySafeName(property);
    var inValue = "In" + property.name;

    var result = tabbing + "for (const " + getPropertyUe4ToOpaqueType(property, api, datatype) + "& elem : " + inValue + ")\n";
    result += tabbing + "{\n";
    if (property.isenum)
        result += tabbing + "    Out.Data." + safePropName + ".Add(static_cast<" + getProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(elem)));\n";
    else if (property.isclass)
        result += tabbing + "    Out.Data." + safePropName + ".Add(elem.Data);\n";
    else  // should really only be number types
        result += tabbing + "    Out.Data." + safePropName + ".Add(static_cast<" + getProperyUe4ToNativeType(property, api, datatype) + ">(elem));\n";
    result += tabbing + "}\n";
    return result;
}

function generateProxyPropertyWrite(tabbing, property, api, datatype) {
    if (property.name === "TitleId") // TitleId is set via PlayFab project settings
        return "";

    // handle optional classes
    // should this return the pointer instead?
    var safePropName = getPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection)
        return tabbing + "Out.Data." + safePropName + " = MakeShareable(new " + getProperyUe4ToNativeType(property, api, datatype) + "(In" + property.name + ".Data));\n";
    else if (property.collection === "array" && (property.jsontype === "Object" || property.isenum))
        return generateArrayClassProxyWrite(tabbing, property, api, datatype);
    else if (property.collection === "map" && (property.isclass || property.isenum || getProperyUe4ToNativeType(property, api, datatype) !== getPropertyUe4ToOpaqueType(property, api, datatype)))
        return generateMapClassProxyWrite(tabbing, property, api, datatype);
    else if (property.isenum)
        return tabbing + "Out.Data." + safePropName + " = static_cast<" + getProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(In" + property.name + "));\n";
    else if (property.actualtype === "object")
        return tabbing + "Out.Data." + safePropName + " = In" + property.name + "->GetRootValue();\n";
    else if (property.isclass)
        return tabbing + "Out.Data." + safePropName + " = In" + property.name + ".Data;\n";
    else
        return tabbing + "Out.Data." + safePropName + " = In" + property.name + ";\n";
}

//////////////////
// Read properties
function generateMapClassProxyRead(tabbing, property, api, datatype) {
    var safePropName = getPropertySafeName(property);
    var inValue = "In.Data." + safePropName;

    var result = tabbing + "for (auto& elem : " + inValue + ")\n";
    result += tabbing + "{\n";
    result += tabbing + "    const " + getProperyUe4ToNativeType(property, api, datatype) + " value = elem.Value;\n";
    if (property.isenum) {
        result += tabbing + "    Out" + property.name + ".Add(elem.Key, static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(value)));\n";
    } else if (property.isclass) {
        result += tabbing + "    Out" + property.name + ".Add(elem.Key, " + getPropertyUe4ToOpaqueType(property, api, datatype) + "(value));\n";
    } else if (property.actualtype === "object") {
        result += tabbing + "    " + getPropertyUe4ToOpaqueType(property, api, datatype) + " " + safePropName + "Val = NewObject<UPlayFabJsonValue>();\n"
            + tabbing + "    " + safePropName + "Val->SetRootValue(value.GetJsonValue());\n"
            + tabbing + "    Out" + property.name + ".Add(elem.Key, " + safePropName + "Val);\n";
    } else { // should really only be number types
        result += tabbing + "    Out" + property.name + ".Add(elem.Key, static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(value));\n";
    }
    result += tabbing + "}\n";
    return result;
}

function generateArrayClassProxyRead(tabbing, property, api, datatype) {
    var safePropName = getPropertySafeName(property);
    var inValue = "In.Data." + safePropName;

    var result = tabbing + "for (const " + getProperyUe4ToNativeType(property, api, datatype) + "& elem : " + inValue + ")\n";
    result += tabbing + "{\n";
    if (property.isenum) {
        result += tabbing + "    Out" + property.name + ".Add(static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(elem)));\n";
    } else if (property.isclass) {
        result += tabbing + "    Out" + property.name + ".Add(" + getPropertyUe4ToOpaqueType(property, api, datatype) + "(elem));\n";
    } else { // should really only be number types
        result += tabbing + "    Out" + property.name + ".Add(static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(elem));\n";
    }
    result += tabbing + "}\n";
    return result;
}

function generateProxyPropertyRead(tabbing, property, api, datatype) {
    if (property.name === "TitleId") // TitleId is set via PlayFab project settings
        return "";

    // handle optional classes
    // should this return the pointer instead?
    var safePropName = getPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection)
        return tabbing + "if (In.Data." + safePropName + ".IsValid()) { Out" + property.name + ".Data = *In.Data." + safePropName + "; }\n";
    else if (property.collection === "array" && (property.jsontype === "Object" || property.isenum))
        return generateArrayClassProxyRead(tabbing, property, api, datatype);
    else if (property.collection === "map" && (property.isclass || property.isenum || getProperyUe4ToNativeType(property, api, datatype) !== getPropertyUe4ToOpaqueType(property, api, datatype)))
        return generateMapClassProxyRead(tabbing, property, api, datatype);
    else if (property.isenum && property.optional)
        return tabbing + "if (In.Data." + safePropName + ".notNull()) { Out" + property.name + " = static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(In.Data." + safePropName + ".mValue)); }\n";
    else if (property.isenum)
        return tabbing + "Out" + property.name + " = static_cast<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(In.Data." + safePropName + "));\n";
    else if (property.actualtype === "object")
        return tabbing + getPropertyUe4ToOpaqueType(property, api, datatype) + " " + safePropName + "Val = NewObject<UPlayFabJsonValue>();\n"
            + tabbing + safePropName + "Val->SetRootValue(In.Data." + safePropName + ".GetJsonValue());\n"
            + tabbing + "Out" + property.name + " = " + safePropName + "Val;\n";
    else if (property.isclass)
        return tabbing + "Out" + property.name + ".Data = In.Data." + safePropName + ";\n";
    else
        return tabbing + "Out" + property.name + " = In.Data." + safePropName + ";\n";
}

//////////////////////////////////////////////////////////////////////////
// generate opaque type
function getBpPropertyDefinition(property, api, datatype) {
    if (property.collection === "array") {
        return "TArray<" + getPropertyUe4ToOpaqueType(property, api, datatype) + ">";
    } else if (property.collection === "map") {
        return "TMap<FString, " + getPropertyUe4ToOpaqueType(property, api, datatype) + ">";
    }

    return getPropertyUe4ToOpaqueType(property, api, datatype);
}

function getPropertyUe4ToOpaqueType(property, api, datatype) {
    var propertyUe4Type;

    if (property.actualtype === "String")
        propertyUe4Type = "FString";
    else if (property.actualtype === "Boolean")
        propertyUe4Type = "bool";
    else if (property.actualtype === "int16")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint16")
        propertyUe4Type = "int32";
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
        propertyUe4Type = "EBP" + api.name + property.actualtype;
    else if (property.actualtype === "object")
        propertyUe4Type = "UPlayFabJsonValue*";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    return propertyUe4Type;
}

function getProperyUe4ToNativeType(property, api, datatype) {
    var propertyUe4Type;

    if (property.actualtype === "String")
        propertyUe4Type = "FString";
    else if (property.actualtype === "Boolean")
        propertyUe4Type = "bool";
    else if (property.actualtype === "int16")
        propertyUe4Type = "int16";
    else if (property.actualtype === "uint16")
        propertyUe4Type = "uint16";
    else if (property.actualtype === "int32")
        propertyUe4Type = "int32";
    else if (property.actualtype === "uint32")
        propertyUe4Type = "uint32";
    else if (property.actualtype === "int64")
        propertyUe4Type = "int64";
    else if (property.actualtype === "uint64")
        propertyUe4Type = "uint64";
    else if (property.actualtype === "float")
        propertyUe4Type = "float";
    else if (property.actualtype === "double")
        propertyUe4Type = "double";
    else if (property.actualtype === "DateTime")
        propertyUe4Type = "FDateTime";
    else if (property.isclass)
        propertyUe4Type = "PlayFab::" + api.name + "Models::F" + property.actualtype;
    else if (property.isenum)
        propertyUe4Type = "PlayFab::" + api.name + "Models::" + property.actualtype;
    else if (property.actualtype === "object")
        propertyUe4Type = "PlayFab::FJsonKeeper";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    return propertyUe4Type;
}
