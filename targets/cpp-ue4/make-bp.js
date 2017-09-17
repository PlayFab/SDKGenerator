var path = require("path");

exports.MakeBp = function (api, sourceDir, apiOutputDir, subdir) {
	// generate BP proxy
    GenerateBpProxy(api, sourceDir, apiOutputDir, subdir);

    // generate BP library
    GenerateBpLibrary(api, sourceDir, apiOutputDir, subdir);

    // generate BP data models
    GenerateBpDataModels(api, sourceDir, apiOutputDir, subdir);
}

function GenerateBpProxy(api, sourceDir, apiOutputDir, subdir) {
	var proxyApiHeaderTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.h.ejs"));
    var proxyApiBodyTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPI.cpp.ejs"));

	for (var i in api.calls) {
		var apiLocals = {};
		apiLocals.api = api;
		apiLocals.apiCall = api.calls[i];
		apiLocals.HasRequest = HasRequest;
		apiLocals.HasResult = HasResult;
		apiLocals.GetDatatypeSignatureInputParameters = GetDatatypeSignatureInputParameters;

		var generatedHeader = proxyApiHeaderTemplate(apiLocals);
		writeFile(path.resolve(apiOutputDir, "Public/" + subdir + api.name + "/" + "PF"  + api.name + api.calls[i].name + ".h"), generatedHeader);

		var generatedBody = proxyApiBodyTemplate(apiLocals);
		writeFile(path.resolve(apiOutputDir, "Private/" + subdir + api.name + "/" + "PF"  + api.name + api.calls[i].name + ".cpp"), generatedBody);
	}
}

function GenerateBpLibrary(api, sourceDir, apiOutputDir, subdir) {
    var bpLibraryLocal = {};
    bpLibraryLocal.api = api;
    bpLibraryLocal.GetDatatypeSignatureParameters = GetDatatypeSignatureParameters;
	bpLibraryLocal.GenerateProxyPropertyWrite = GenerateProxyPropertyWrite;
    bpLibraryLocal.GenerateProxyPropertyRead = GenerateProxyPropertyRead;
    bpLibraryLocal.IsRequest = IsRequest;
    bpLibraryLocal.IsResult = IsResult;

    var proxyBpLibraryHeaderTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.h.ejs"));
    var proxyBpLibraryBodyTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyAPIBlueprintLibrary.cpp.ejs"));

    var generatedBpHeader = proxyBpLibraryHeaderTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.h"), generatedBpHeader);

    var generatedBpBody = proxyBpLibraryBodyTemplate(bpLibraryLocal);
    writeFile(path.resolve(apiOutputDir, "Private/" + subdir + "/" + "PlayFab" + api.name + "BPLibrary.cpp"), generatedBpBody);
}

function GenerateBpDataModels(api, sourceDir, apiOutputDir, subdir) {
    var proxyBpModelHeaderTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/blueprint/PlayFabProxyDataModelsAPI.h.ejs"));

    var bpModelsLocal = {};
    bpModelsLocal.api = api;
    bpModelsLocal.NeedsDelegate = NeedsDelegate;
	bpModelsLocal.IsRequest = IsRequest;
    bpModelsLocal.IsResult = IsResult;

    var generatedBpHeader = proxyBpModelHeaderTemplate(bpModelsLocal);
    writeFile(path.resolve(apiOutputDir, "Public/" + subdir + "/" + "PlayFab" + api.name + "BPDataModels.h"), generatedBpHeader);
}

function NeedsDelegate(name) {
	if (IsResult(name))
    	return true;
	return false;
}

function IsRequest(name) {
    return name.indexOf("Request") > -1;
}

function IsResult(name) {
    return name.indexOf("Result") > -1 || name.indexOf("Response") > -1; // PlayFab should decide if they want it to be "Response" or "Result" ffs
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function HasResult(apiCall, api) {
    var requestType = api.datatypes[apiCall.result];
    return requestType.properties.length > 0;
}

function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetDatatypeSignatureInputParameters(apiCall, api) {
    var result = "";

    if (HasRequest(apiCall, api) === false) {
        return result;
    }

    var datatype = api.datatypes[apiCall.request];

	return ", const FBP" + api.name + datatype.name + "& In" + datatype.name;
}

function GetDatatypeSignatureParameters(datatype, api, make) {
    var result = "";

    if (datatype.properties) {
		var makeCount = 0;
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];

			if (make) {
				makeCount = makeCount + 1;
				if (makeCount != 1)
				{
					result += "\t, ";
				}
				result += GetBpPropertyDefinition(property, api) + " In" + property.name + "\n";
			} else {
				result += "\t, " + GetBpPropertyDefinition(property, api) + "& Out" + property.name + "\n";
			}
        }
    }

    return result;
}

///////////////////
// Write properties
function GenerateMapClassProxyWrite(property, api, datatype) {
	var safePropName = GetPropertySafeName(property);
    var inValue = "In" + property.name;

    var result = "";
    result += "" + "for (auto& elem : " + inValue + ")";
    result += "\n\t" + "{";
	result += "\n\t\t" + "const " + GetPropertyUe4ToOpaqueType(property, api, datatype) + " value = elem.Value;";
    if (property.isenum) {
		result += "\n\t\t" + "Out.Data." + safePropName + ".Add(elem.Key, static_cast<" + GetProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(value)));";
    } else if (property.isclass) {
        result += "\n\t\t" + "Out.Data." + safePropName + ".Add(elem.Key, value.Data);";
	} else if (property.actualtype === "object") {
		result += "\n\t\t" + "Out.Data." + safePropName + ".Add(elem.Key, value->GetRootValue());";
    } else { // should really only be number types
		result += "\n\t\t" + "Out.Data." + safePropName + ".Add(elem.Key, static_cast<" + GetProperyUe4ToNativeType(property, api, datatype) + ">(value));";
	}
    result += "\n\t" + "}";
    return result;
}

function GenerateArrayClassProxyWrite(property, api, datatype) {
	var safePropName = GetPropertySafeName(property);
    var inValue = "In" + property.name;

    var result = "";
    result += "" + "for (const " + GetPropertyUe4ToOpaqueType(property, api, datatype) + "& elem : " + inValue + ")";
    result += "\n\t" + "{";
    if (property.isenum) {
		result += "\n\t\t" + "Out.Data." + safePropName + ".Add(static_cast<" + GetProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(elem)));";
    } else if (property.isclass) {
        result += "\n\t\t" + "Out.Data." + safePropName + ".Add(elem.Data);";
    } else {  // should really only be number types
		result += "\n\t\t" + "Out.Data." + safePropName + ".Add(static_cast<" + GetProperyUe4ToNativeType(property, api, datatype) + ">(elem));";
    }
    result += "\n\t" + "}";
    return result;
}

function GenerateProxyPropertyWrite(property, api, datatype) {
    // handle optional classes
    // should this return the pointer instead?
	var safePropName = GetPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection) {
        var result = "";
        result += "Out.Data." + safePropName + " = MakeShareable(new " + GetProperyUe4ToNativeType(property, api, datatype) + "(In" + property.name + ".Data));";
        return result;
    }

    if (property.collection === "array" && (property.isclass || property.isenum || property.actualtype === "uint64"))
        return GenerateArrayClassProxyWrite(property, api, datatype);
	else if (property.collection === "map" && (property.isclass || property.isenum || GetProperyUe4ToNativeType(property, api, datatype) != GetPropertyUe4ToOpaqueType(property, api, datatype)))
		return GenerateMapClassProxyWrite(property, api, datatype);
	else if (property.isenum)
        return "Out.Data." + safePropName + " = static_cast<" + GetProperyUe4ToNativeType(property, api, datatype) + ">(static_cast<uint8>(In" + property.name + "));";
    else if (property.actualtype === "object")
        return "Out.Data." + safePropName + " = In" + property.name + "->GetRootValue();";
    else if (property.isclass)
        return "Out.Data." + safePropName + " = In" + property.name + ".Data;";
    return "Out.Data." + safePropName + " = In" + property.name + ";";
}

//////////////////
// Read properties
function GenerateMapClassProxyRead(property, api, datatype) {
	var safePropName = GetPropertySafeName(property);
    var inValue = "In.Data." + safePropName;

    var result = "";
    result += "" + "for (auto& elem : " + inValue + ")";
    result += "\n\t" + "{";
	result += "\n\t\t" + "const " + GetProperyUe4ToNativeType(property, api, datatype) + " value = elem.Value;";
    if (property.isenum) {
		result += "\n\t\t" + "Out" + property.name + ".Add(elem.Key, static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(value)));";
    } else if (property.isclass) {
        result += "\n\t\t" + "Out" + property.name + ".Add(elem.Key, " + GetPropertyUe4ToOpaqueType(property, api, datatype) + "(value));";
	} else if (property.actualtype === "object") {
		result += "\n\t\t" + GetPropertyUe4ToOpaqueType(property, api, datatype) + " val = NewObject<UPlayFabJsonValue>();";
		result += "\n\t\t" + "val->SetRootValue(value.GetJsonValue());";
		result += "\n\t\t" + "Out" + property.name + ".Add(elem.Key, val);";
    } else { // should really only be number types
		result += "\n\t\t" + "Out" + property.name + ".Add(elem.Key, static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(value));";
	}
    result += "\n\t" + "}";
    return result;
}

function GenerateArrayClassProxyRead(property, api, datatype) {
	var safePropName = GetPropertySafeName(property);
    var inValue = "In.Data." + safePropName;

    var result = "";
    result += "" + "for (const " + GetProperyUe4ToNativeType(property, api, datatype) + "& elem : " + inValue + ")";
    result += "\n\t" + "{";
    if (property.isenum) {
		result += "\n\t\t" + "Out" + property.name + ".Add(static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(elem)));";
	} else if (property.isclass) {
        result += "\n\t\t" + "Out" + property.name + ".Add(" + GetPropertyUe4ToOpaqueType(property, api, datatype) + "(elem));";
    } else { // should really only be number types
    	result += "\n\t\t" + "Out" + property.name + ".Add(static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(elem));";
    }
    result += "\n\t" + "}";
    return result;
}

function GenerateProxyPropertyRead(property, api, datatype) {
    // handle optional classes
    // should this return the pointer instead?
	var safePropName = GetPropertySafeName(property);
    if (property.isclass && property.optional && !property.collection) {
        var result = "";
        result += "if (In.Data." + safePropName + ".IsValid()) {";
        result += "Out" + property.name + ".Data = *In.Data." + safePropName + ";";
        result += "}";
        return result;
    }

    if (property.collection === "array" && (property.isclass || property.isenum || property.actualtype === "uint64"))
        return GenerateArrayClassProxyRead(property, api, datatype);
	else if (property.collection === "map" && (property.isclass || property.isenum || GetProperyUe4ToNativeType(property, api, datatype) != GetPropertyUe4ToOpaqueType(property, api, datatype)))
		return GenerateMapClassProxyRead(property, api, datatype);
	else if (property.isenum && property.optional) {
		var result = "";
		result += "if (In.Data." + safePropName + ".notNull()) {";
		result += "Out" + property.name + " = static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(In.Data." + safePropName + ".mValue));";
		result += "}";
        return result;
	} else if (property.isenum)
        return "Out" + property.name + " = static_cast<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">(static_cast<uint8>(In.Data." + safePropName + "));";
    else if (property.actualtype === "object") {
		var result = "";
		result += GetPropertyUe4ToOpaqueType(property, api, datatype) + " val = NewObject<UPlayFabJsonValue>();";
		result += "\n\t" + "val->SetRootValue(In.Data." + safePropName + ".GetJsonValue());";
		result += "\n\t" + "Out" + property.name + " = val;";
        return result;
    } else if (property.isclass)
        return "Out" + property.name + ".Data = In.Data." + safePropName + ";";
    return "Out" + property.name + " = In.Data." + safePropName + ";";
}

//////////////////////////////////////////////////////////////////////////
// generate opaque type
function GetBpPropertyDefinition(property, api, datatype) {
    if (property.collection === "array") {
        return "TArray<" + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">";
    } else if (property.collection === "map") {
        return "TMap<FString, " + GetPropertyUe4ToOpaqueType(property, api, datatype) + ">";
    }

    return GetPropertyUe4ToOpaqueType(property, api, datatype);
}

function GetNativePropertyDefinition(property, api, datatype) {
    if (property.collection === "array") {
        return "TArray<" + GetProperyUe4ToNativeType(property, api, datatype) + ">";
    } else if (property.collection === "map") {
        return "TMap<FString, " + GetProperyUe4ToNativeType(property, api, datatype) + ">";
    }

    return GetProperyUe4ToNativeType(property, api, datatype);
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

function GetProperyUe4ToNativeType(property, api, datatype) {
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
