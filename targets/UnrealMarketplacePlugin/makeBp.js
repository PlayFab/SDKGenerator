var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (templatizeTree) === "undefined") templatizeTree = function () { };
if (typeof (generateApiSummaryLines) === "undefined") generateApiSummaryLines = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeBpCombinedAPI = function (apis, copyright, sourceDir, apiOutputDir, ueTargetVersion, sdkVersion, buildIdentifier) {
    apiOutputDir = path.join(apiOutputDir, "PlayFabPlugin");
    makeApiIntermal(apis, copyright, sourceDir, apiOutputDir, "All", ueTargetVersion, sdkVersion, buildIdentifier);
}

function makeApiIntermal(apis, copyright, sourceDir, apiOutputDir, libName, ueTargetVersion, sdkVersion, buildIdentifier) {
    console.log("Generating Unreal Engine Blueprints module to " + apiOutputDir);

    var authMechanisms = getAuthMechanisms(apis);
    var locals = {
        apis: apis,
        copyright: copyright,
        buildIdentifier: buildIdentifier,
        enumTypes: collectEnumsFromApis(apis),
        generateApiSummary: generateApiSummary,
        getDataTypeSafeName: getDataTypeSafeName,
        hasClientOptions: authMechanisms.includes("SessionTicket"),
        hasServerOptions: authMechanisms.includes("SecretKey"),
        libName: libName,
        sdkVersion: sdkVersion,
        ueTargetVersion: ueTargetVersion
    };

    // Copy over the standard source files to the plugin destination
    templatizeTree(locals, path.resolve(sourceDir, "source/PlayFab/Source/PlayFab"), path.resolve(apiOutputDir, "PlayFab/Source/PlayFab"));
    
    // Make the variable api files
    for (var a2 = 0; a2 < apis.length; a2++)
        makeApiFiles(apis[a2], copyright, apiOutputDir, sourceDir, libName);
}

// Pull all the enums out of all the apis, and collect them into a single collection of just the enum types and filter duplicates
function collectEnumsFromApis(apis) {
    var enumTypes = {};
    for (var a = 0; a < apis.length; a++)
        for (var d in apis[a].datatypes)
            if (apis[a].datatypes[d].isenum && apis[a].datatypes[d].enumvalues.length <= 255)
                enumTypes[d] = apis[a].datatypes[d];
    return enumTypes;
}

// Create Models, .h and .cpp files
function makeApiFiles(api, copyright, apiOutputDir, sourceDir, libName) {
    var apiLocals = {
        api: api,
        copyright: copyright,
        getAuthBools: getAuthBools,
        getPropertyCppType: getPropertyCppType,
        generateApiSummary: generateApiSummary,
        getPropertySerialization: getPropertySerialization,
        getPropertyDeserialization: getPropertyDeserialization,
        getDataTypeSafeName: getDataTypeSafeName,
        hasClientOptions: getAuthMechanisms([api]).includes("SessionTicket"),
        libName: libName,
        sdkVersion: exports.sdkVersion
    };

    var apiHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_API.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), apiHeaderTemplate(apiLocals));
    var apiCppTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_API.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), apiCppTemplate(apiLocals));

    var apiPlayFabModelTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_Models.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "Models.h"), apiPlayFabModelTemplate(apiLocals));
    var apiPlayFabModelCppTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_Models.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "Models.cpp"), apiPlayFabModelCppTemplate(apiLocals));

    var apiPlayFabModelDecoderHTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_ModelDecoder.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "ModelDecoder.h"), apiPlayFabModelDecoderHTemplate(apiLocals));
    var apiPlayFabModelDecoderCppTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFab/PlayFab_ModelDecoder.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "ModelDecoder.cpp"), apiPlayFabModelDecoderCppTemplate(apiLocals));
}

// Any playfab datatype names that conflict with Unreal datatype names need to be prefixed with "Pf-"
function getDataTypeSafeName(apiElement, attrName) {
    var pfTypeName = apiElement[attrName];
    if (pfTypeName === "SourceType") // In Unreal, the Enum ESourceType exists in the Android builder and conflicts with our ESourceType enum
        return "PfSourceType";
    return pfTypeName;
}

function getPropertySafeName(property) {
    // Turns out we didn't need this at the time it was added, but it's a good pattern
    return property.name;
}

function getPropertyCppType(property, datatype) {
    var propSafeName = getPropertySafeName(property);
    var isCollection = property.hasOwnProperty("collection");
    var isArray = isCollection && property.collection === "array";

    switch (property.jsontype) {
        case "String":
            if (isCollection && isArray) {
                return "FString " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else if (property.isenum) {
                return "E" + getDataTypeSafeName(property, "actualtype") + " " + propSafeName + ";";
            } else {
                return "FString " + propSafeName + ";";
            }
        case "Boolean":
            if (isCollection && isArray) {
                return "TArray<bool> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else {
                return "bool " + propSafeName + " = false;";
            }
        case "Number":
            if (isCollection && isArray) {
                return "TArray<int32> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else {
                return "int32 " + propSafeName + " = 0;";
            }
        case "Object":
            if (isCollection && isArray) {
                return "TArray<UPlayFabJsonObject*> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + " = nullptr;";
            } else {
                return "UPlayFabJsonObject* " + propSafeName + " = nullptr;";
            }
    }

    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function getPropertySerialization(tabbing, property, datatype) {
    var propSafeName = getPropertySafeName(property);
    var isCollection = property.hasOwnProperty("collection");
    var isArray = isCollection && property.collection === "array";

    switch (property.jsontype) {
        case "String":
            if (propSafeName === "ParamsEncoded") {
                return tabbing + "if (request.ParamsEncoded != \"\") OutRestJsonObj->SetStringField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            }
            if (property.name === "TitleId") {
                return tabbing + "OutRestJsonObj->SetStringField(TEXT(\"" + property.name + "\"), IPlayFab::Get().getGameTitleId());\n";
            }
            if (isCollection && isArray) {
                return tabbing + "// Check to see if string is empty\n"
                    + tabbing + "if (request." + propSafeName + ".IsEmpty() || request." + propSafeName + " == \"\") {\n"
                    + tabbing + "    OutRestJsonObj->SetFieldNull(TEXT(\"" + property.name + "\"));\n"
                    + tabbing + "} else {\n"
                    + tabbing + "    TArray<FString> " + propSafeName + "Array;\n"
                    + tabbing + "    FString(request." + propSafeName + ").ParseIntoArray(" + propSafeName + "Array, TEXT(\",\"), false);\n"
                    + tabbing + "    OutRestJsonObj->SetStringArrayField(TEXT(\"" + property.name + "\"), " + propSafeName + "Array);\n"
                    + tabbing + "}\n";
            } else if (isCollection) {
                return tabbing + "if (request." + propSafeName + " != nullptr) OutRestJsonObj->SetObjectField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            } else if (property.isenum) {
                return tabbing + "FString temp_" + propSafeName + ";\n"
                    + tabbing + "if (GetEnumValueToString<E" + getDataTypeSafeName(property, "actualtype") + ">(TEXT(\"E" + getDataTypeSafeName(property, "actualtype") + "\"), request." + propSafeName + ", temp_" + propSafeName + "))\n"
                    + tabbing + "    OutRestJsonObj->SetStringField(TEXT(\"" + property.name + "\"), temp_" + propSafeName + ");\n";
            } else {
                return tabbing + "if (request." + propSafeName + ".IsEmpty() || request." + propSafeName + " == \"\") {\n"
                    + tabbing + "    OutRestJsonObj->SetFieldNull(TEXT(\"" + property.name + "\"));\n"
                    + tabbing + "} else {\n"
                    + tabbing + "    OutRestJsonObj->SetStringField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n"
                    + tabbing + "}\n";
            }
        case "Number":
            if (isCollection && isArray) {
                return tabbing + "// Copy int array to float\n"
                    + tabbing + "TArray<float> tempArray;\n"
                    + tabbing + "for (int32 i = 0; i < request." + propSafeName + ".Num(); ++i) {\n"
                    + tabbing + "    tempArray.Add(float(request." + propSafeName + "[i]));\n"
                    + tabbing + "}\n"
                    + tabbing + "if (tempArray.Num() == 0) {\n"
                    + tabbing + "    OutRestJsonObj->SetFieldNull(TEXT(\"" + property.name + "\"));\n"
                    + tabbing + "} else {\n"
                    + tabbing + "    OutRestJsonObj->SetNumberArrayField(TEXT(\"" + property.name + "\"), tempArray);\n"
                    + tabbing + "}\n";
            } else if (isCollection) {
                return tabbing + "if (request." + propSafeName + " != nullptr) OutRestJsonObj->SetObjectField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            } else {
                return tabbing + "OutRestJsonObj->SetNumberField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            }
        case "Object":
            if (isCollection && isArray) {
                return tabbing + "if (request." + propSafeName + ".Num() == 0) {\n"
                    + tabbing + "    OutRestJsonObj->SetFieldNull(TEXT(\"" + property.name + "\"));\n"
                    + tabbing + "} else {\n"
                    + tabbing + "    OutRestJsonObj->SetObjectArrayField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n"
                    + tabbing + "}\n";
            } else if (isCollection) {
                return tabbing + "if (request." + propSafeName + " != nullptr) OutRestJsonObj->SetObjectField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            } else {
                return tabbing + "if (request." + propSafeName + " != nullptr) OutRestJsonObj->SetObjectField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            }
        case "Boolean":
            if (isCollection && isArray) {
                return tabbing + "if (request." + propSafeName + ".Num() == 0) {\n"
                    + tabbing + "    OutRestJsonObj->SetFieldNull(TEXT(\"" + property.name + "\"));\n"
                    + tabbing + "} else {\n"
                    + tabbing + "    OutRestJsonObj->SetBoolArrayField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n"
                    + tabbing + "}\n";
            } else if (isCollection) {
                return tabbing + "if (request." + propSafeName + " != nullptr) OutRestJsonObj->SetObjectField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            } else {
                return tabbing + "OutRestJsonObj->SetBoolField(TEXT(\"" + property.name + "\"), request." + propSafeName + ");\n";
            }
    }
    throw "Cannot parse property: " + datatype.name + "." + property.name;
}

function getPropertyDeserialization(tabbing, property, datatype) {
    var propSafeName = getPropertySafeName(property);
    var isCollection = property.hasOwnProperty("collection");
    var isArray = isCollection && property.collection === "array";
    var isMap = isCollection && property.collection === "map";

    switch (property.jsontype) {
        case "String":
            if (isCollection && isArray) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? TEXT(\"\") : FString::Join(dataObj->GetStringArrayField(\"" + property.name + "\"), TEXT(\",\"));";
            } else if (isCollection && isMap) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? nullptr : dataObj->GetObjectField(\"" + property.name + "\");";
            } else if (property.isenum) {
                return tabbing + "GetEnumValueFromString<E" + getDataTypeSafeName(property, "actualtype") + ">(TEXT(\"E" + getDataTypeSafeName(property, "actualtype") + "\"), dataObj->GetStringField(\"" + property.name + "\"), tempStruct." + propSafeName + ");";
            } else {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? TEXT(\"\") : dataObj->GetStringField(\"" + property.name + "\");";
            }
        case "Boolean":
            if (isCollection && isArray) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? TArray<UPlayFabJsonObject*>() : dataObj->GetBoolArrayField(\"" + property.name + "\");";
            } else if (isCollection) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? nullptr : dataObj->GetObjectField(\"" + property.name + "\");";
            } else {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? false : dataObj->GetBoolField(\"" + property.name + "\");";
            }
        case "Number":
            if (isCollection && isArray) {
                return tabbing + "// Copy int array to float"
                    + tabbing + "TArray<int32> tempArray;"
                    + tabbing + "for (int32 i = 0; i < dataObj->GetNumberArrayField(\"" + property.name + "\"); ++i) {"
                    + tabbing + "    tempArray.Add(int(dataObj->GetNumberArrayField(\"" + property.name + "\")[i]));"
                    + tabbing + "}"
                    + tabbing + "tempStruct." + propSafeName + " = tempArray;";
            } else if (isCollection) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? nullptr : dataObj->GetObjectField(\"" + property.name + "\");";
            } else {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? 0 : int(dataObj->GetNumberField(\"" + property.name + "\"));";
            }
        case "Object":
            if (isCollection && isArray) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? TArray<UPlayFabJsonObject*>() : dataObj->GetObjectArrayField(\"" + property.name + "\");";
            } else if (isCollection) {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? nullptr : dataObj->GetObjectField(\"" + property.name + "\");";
            } else {
                return tabbing + "tempStruct." + propSafeName + " = !(dataObj->HasField(\"" + property.name + "\")) ? nullptr : dataObj->GetObjectField(\"" + property.name + "\");";
            }
    }
    throw "Cannot parse property: " + datatype.name + "." + property.name;
}

function generateApiSummary(tabbing, apiElement, summaryParam, extraLines) {
    var lines = generateApiSummaryLines(apiElement, summaryParam, extraLines);

    var output;
    if (lines.length === 1 && lines[0]) {
        output = tabbing + "/** " + lines[0] + " */\n";
    } else if (lines.length > 0) {
        output = tabbing + "/**\n" + tabbing + " * " + lines.join("\n" + tabbing + " * ") + "\n" + tabbing + " */\n";
    } else {
        output = "";
    }
    return output;
}

function getAuthBools(tabbing, apiCall) {
    var output = "";
    if (apiCall.auth === "EntityToken" || apiCall.url === "/Authentication/GetEntityToken")
        output += tabbing + "manager->useEntityToken = true;\n";
    if (apiCall.auth === "SecretKey" || apiCall.url === "/Authentication/GetEntityToken")
        output += tabbing + "manager->useSecretKey = true;\n";
    if (apiCall.auth === "SessionTicket" || apiCall.url === "/Authentication/GetEntityToken")
        output += tabbing + "manager->useSessionTicket = true;\n";

    if (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")
        output += tabbing + "manager->returnsSessionTicket = true;\n";
    if (apiCall.url === "/Authentication/GetEntityToken")
        output += tabbing + "manager->returnsEntityToken = true;\n";

    return output;
}
