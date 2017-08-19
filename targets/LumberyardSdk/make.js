var path = require("path");

// Lumberyard has pretty significantly different imports from the other C++ sdks
// It is also more closely structured like UnitySDK, and should hopefully be closer to implementing the
//   global callback system.  So for now, there is no shared code between the other C++ sdks and lumberyard.

var uuids = {
    // These matter a great deal, and need to be set properly in specific places
    "Client": "59aceeb4fcdc4556859a00fdef51702b",
    "Server": "a7bd94263453450a8cff6c8d047a82ee",
    "Combo": "abf1282cbb534d908e39e0684e34cb20",
    "TestGemClient": "a283c61c3bb84efbb6bfbd04c9b2f0d0",
    "TestGemServer": "1ef0cc192c26498e9d87e5940d0f0154",
    "TestGemCombo": "fee877ce92be40deb14badcc4b93b6ff",
};

var sysCmpTokens = {
    // These don't seem to matter much, but I borrowed the ones that were auto-generated and made them unique for each SysCmp in each Gem
    "ClientSettings": "FDEEA325-EC4C-4D4B-9FBD-E64A8D523CE0",
    "ClientClient": "FDEEA325-EC4C-4D4B-9FBD-E64A8D523CE6",

    "ComboSettings": "525A86F9-CFF4-4868-A55F-24F5E76823C0",
    "ComboAdmin": "525A86F9-CFF4-4868-A55F-24F5E76823CA",
    "ComboClient": "525A86F9-CFF4-4868-A55F-24F5E76823CB",
    "ComboMatchmaker": "525A86F9-CFF4-4868-A55F-24F5E76823CC",
    "ComboServer": "525A86F9-CFF4-4868-A55F-24F5E76823CD",

    "ServerSettings": "9C3DF7E4-CCFD-42F4-9B75-0B9DF4894560",
    "ServerAdmin": "9C3DF7E4-CCFD-42F4-9B75-0B9DF489456D",
    "ServerMatchmaker": "9C3DF7E4-CCFD-42F4-9B75-0B9DF489456E",
    "ServerServer": "9C3DF7E4-CCFD-42F4-9B75-0B9DF489456F",

    "TestGemClient": "71FD0DA7-A873-4672-A46F-D0A2FD686FA5",
    "TestGemCombo": "B7AF3C21-D689-4A83-86F5-00EA210D0A22",
    "TestGemServer": "5AB613A1-8AA2-4099-AFAB-F43CACC66A60",
}

var sdkModuleTokens = {
    // These matter a great deal, and need to be set properly in specific places
    "Client": "F73EAA98-BB00-45D4-832F-6001FF96D66E",
    "Combo": "C035EAD2-AD5D-458E-9D11-93B2E318CD09",
    "Server": "F73EAA98-BB00-45D4-832F-6001FF96D66E",
    "TestGemClient": "866F12CD-AADA-4B57-932B-123B3B14E59F",
    "TestGemCombo": "0757A088-EC2D-4417-9F45-FB1DF16A80E6",
    "TestGemServer": "A16750F6-EA08-4E1E-BA74-400BBECF9606",
}

var gemSummaries = {
    Client: "PlayFab Lumberyard Client SDK can be used in your game client to connect to PlayFab services from a Lumberyard project",
    Server: "PlayFab Lumberyard Server SDK can be used for matchmaking and game servers, and connects to PlayFab services from a Lumberyard project",
    Combo: "PlayFab Lumberyard Combined SDK can be used for game servers, internal tools, special situations, and testing PlayFab services from a Lumberyard project",
};

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    apiOutputDir = apiOutputDir.replaceAll("PlayFabClientSDK", "PlayFabClientSdk");
    console.log("Generating Lumberyard C++ client SDK to " + apiOutputDir);
    gemName = "Client";

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    MakeApi(api, sourceDir, apiOutputDir, gemName);
    GenerateModels([api], sourceDir, apiOutputDir, gemName);
    GenerateErrors(api, sourceDir, apiOutputDir, gemName);
    GenerateSimpleFiles([api], sourceDir, apiOutputDir, gemName);
    GenerateTestFiles([api], sourceDir, apiOutputDir, gemName);
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = apiOutputDir.replaceAll("PlayFabServerSDK", "PlayFabServerSdk");
    console.log("Generating Lumberyard C++ server SDK to " + apiOutputDir);
    gemName = "Server";

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        MakeApi(apis[i], sourceDir, apiOutputDir, gemName);
    }
    GenerateModels(apis, sourceDir, apiOutputDir, gemName);
    GenerateErrors(apis[0], sourceDir, apiOutputDir, gemName);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir, gemName);
    GenerateTestFiles(apis, sourceDir, apiOutputDir, gemName);
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    apiOutputDir = apiOutputDir.replaceAll("PlayFabSDK", "PlayFabComboSdk");
    console.log("Generating Lumberyard C++ combined SDK to " + apiOutputDir);
    gemName = "Combo";

    copyTree(path.resolve(sourceDir, "source"), apiOutputDir);
    for (var i = 0; i < apis.length; i++) {
        MakeApi(apis[i], sourceDir, apiOutputDir, gemName);
    }
    GenerateModels(apis, sourceDir, apiOutputDir, gemName);
    GenerateErrors(apis[0], sourceDir, apiOutputDir, gemName);
    GenerateSimpleFiles(apis, sourceDir, apiOutputDir, gemName);
    GenerateTestFiles(apis, sourceDir, apiOutputDir, gemName);
}

function GenerateSimpleFiles(apis, sourceDir, apiOutputDir, gemName) {
    var locals = {
        apis: apis,
        buildIdentifier: exports.buildIdentifier,
        gemName: gemName,
        gemSummary: gemSummaries[gemName],
        gemUuid: uuids[gemName],
        hasClientOptions: false,
        hasServerOptions: false,
        sdkVersion: exports.sdkVersion,
        sdkModuleTokens: sdkModuleTokens,
        sysCmpTokens: sysCmpTokens,
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client") locals.hasClientOptions = true;
        if (apis[i].name !== "Client") locals.hasServerOptions = true;
    }

    var wafTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/playfab_sdk.waf_files.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/playfab" + gemName.toLowerCase() + "sdk.waf_files"), wafTemplate(locals));

    var wafTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/playfab_sdk_tests.waf_files.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/playfab" + gemName.toLowerCase() + "sdk_tests.waf_files"), wafTemplate(locals));

    var vcProjTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/gem.json.ejs"));
    writeFile(path.resolve(apiOutputDir, "gem.json"), vcProjTemplate(locals));

    var hHttpTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFabHttp.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFabHttp.h"), hHttpTemplate(locals));

    var cppHttpTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFabHttp.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabHttp.cpp"), cppHttpTemplate(locals));

    var hSettingTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFabSettings.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabSettings.h"), hSettingTemplate(locals));

    var cppSettingTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFabSettings.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFabSettings.cpp"), cppSettingTemplate(locals));

    var cppSettingTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Tests/PlayFab_SdkTest.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Tests/PlayFab" + gemName + "SdkTest.cpp"), cppSettingTemplate(locals));

    var sdkModuleTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFab_SdkModule.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "SdkModule.cpp"), sdkModuleTemplate(locals));

    var settingBusCpp = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFab_SettingsBus.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFab" + gemName + "_SettingsBus.h"), settingBusCpp(locals));

    var settingCmpH = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFab_SettingsSysComponent.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "_SettingsSysComponent.h"), settingCmpH(locals));

    var settingCmpCpp = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFab_SettingsSysComponent.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "_SettingsSysComponent.cpp"), settingCmpCpp(locals));

    // Set the PlayFab Gem version in the 1.0 sample project - This is outside of the sdk itself
    try {
        var gemFilePath10 = "C:/dev/Lumberyard1.0/dev/SamplesProject/gems.json";
        var gemsJson10 = require(gemFilePath10);
        for (var a in gemsJson10.Gems)
            if (gemsJson10.Gems[a].Path === "Gems/PlayFabSdk")
                gemsJson10.Gems[a].Version = exports.sdkVersion;
        writeFile(gemFilePath10, JSON.stringify(gemsJson10, null, 4));
    } catch (err) { }

    // Set the PlayFab Gem version in the 1.3 sample project - This is outside of the sdk itself
    try {
        var gemFilePath13 = "C:/dev/Lumberyard1.3/dev/PlayFabTestProj/gems.json";
        var gemsJson13 = require(gemFilePath13);
        for (var b in gemsJson13.Gems)
            if (gemsJson13.Gems[b].Path === "Gems/PlayFabSdk")
                gemsJson13.Gems[b].Version = exports.sdkVersion;
        writeFile(gemFilePath13, JSON.stringify(gemsJson13, null, 4));
    } catch (err) { }
}

function MakeApi(api, sourceDir, apiOutputDir, gemName) {
    var locals = {
        api: api,
        gemUuid: uuids[gemName],
        hasClientOptions: api.name === "Client",
        sysCmpTokens: sysCmpTokens,

        HasRequest: HasRequest,
        GetAuthParams: GetAuthParams,
        GetResultActions: GetResultActions,
        GetRequestActions: GetRequestActions,
    };

    var apiH = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFabApi.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + api.name + "Api.h"), apiH(locals));

    var sysCmpH = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFab_SysComponent.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "_" + api.name + "SysComponent.h"), sysCmpH(locals));

    var sysCmpCpp = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFab_SysComponent.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "_" + api.name + "SysComponent.cpp"), sysCmpCpp(locals));

    var apiCpp = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Source/PlayFabApi.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + api.name + "Api.cpp"), apiCpp(locals));

    var apiCpp = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFab_Bus.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFab" + gemName + "_" + api.name + "Bus.h"), apiCpp(locals));
}

function GenerateTestFiles(apis, sourceDir, apiOutputDir, gemName) {
    var testGemName = "TestGem" + gemName;
    apiOutputDir = apiOutputDir.replaceAll("PlayFabClientSdk", "TestGemClient");
    apiOutputDir = apiOutputDir.replaceAll("PlayFabServerSdk", "TestGemServer");
    apiOutputDir = apiOutputDir.replaceAll("PlayFabComboSdk", "TestGemCombo");
    copyTree(path.resolve(sourceDir, "testingSource"), apiOutputDir);

    var locals = {
        gemName: gemName,
        hasClientOptions: false,
        hasServerOptions: false,
        sdkModuleTokens: sdkModuleTokens,
        sdkVersion: exports.sdkVersion,
        sysCmpTokens: sysCmpTokens,
        testGemName: testGemName,
        uuids: uuids,
    };
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client") locals.hasClientOptions = true;
        if (apis[i].name !== "Client") locals.hasServerOptions = true;
    }

    var gemTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/gem.json.ejs"));
    writeFile(path.resolve(apiOutputDir, "gem.json"), gemTemplate(locals));

    var wafTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/playfab_test.waf_files.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/playfab" + gemName + "test.waf_files"), wafTemplate(locals));

    var testWafTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/playfab_test_tests.waf_files.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/playfab" + gemName + "test_tests.waf_files"), testWafTemplate(locals));

    var busTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/Include/PlayFab_Test/PlayFab_TestBus.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Test/playfab" + gemName + "TestBus.h"), busTemplate(locals));

    var moduleTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/Source/PlayFab_TestModule.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "TestModule.cpp"), moduleTemplate(locals));

    var cppCmpTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/Source/PlayFab_TestSystemComponent.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "TestSystemComponent.cpp"), cppCmpTemplate(locals));

    var hCmpTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/Source/PlayFab_TestSystemComponent.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Source/PlayFab" + gemName + "TestSystemComponent.h"), hCmpTemplate(locals));

    var testTemplate = GetCompiledTemplate(path.resolve(sourceDir, "testingTemplate/Code/Tests/PlayFab_TestTest.cpp.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Tests/PlayFab" + gemName + "TestTest.cpp"), testTemplate(locals));

    if (testGemName === "TestGemClient")
        copyFile(path.resolve(sourceDir, "testingFiles/PlayFabClientApiTestNode.cpp"), path.resolve(apiOutputDir, "Code/Source/PlayFabClientApiTestNode.cpp"));
    else if (testGemName === "TestGemCombo")
        copyFile(path.resolve(sourceDir, "testingFiles/PlayFabComboApiTestNode.cpp"), path.resolve(apiOutputDir, "Code/Source/PlayFabComboApiTestNode.cpp"));
    else if (testGemName === "TestGemServer")
        copyFile(path.resolve(sourceDir, "testingFiles/PlayFabServerApiTestNode.cpp"), path.resolve(apiOutputDir, "Code/Source/PlayFabServerApiTestNode.cpp"));
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function GetDatatypeBaseType(datatype) {
    // The model-inheritance feature was removed.
    // However in the future, we may still use some inheritance links for request/result baseclasses, for other sdk features
    // Specifically, we also have PlayFabResultCommon, which may become a more widely-used pattern
    return "PlayFabBaseModel"; // Everything is a base-model unless it's not
}

function GetPropertyDef(property, datatype) {
    var safePropName = GetPropertySafeName(property);

    if (property.collection === "array")
        return "AZStd::vector<" + GetPropertyCppType(property, datatype, false) + "> " + safePropName + "; 	// #THIRD_KIND_PLAYFAB_BEHAVIOUR_CONTEXT: dbowen (2017/08/11) - Change std::list to AZStd::vector because the latter supports reflection to behavior context.";
    else if (property.collection === "map")
        return "std::map<AZStd::string, " + GetPropertyCppType(property, datatype, false) + "> " + safePropName + ";";
    return GetPropertyCppType(property, datatype, true) + " " + safePropName + ";";
}

function GetPropertyDestructor(tabbing, property) {
    if ((!property.collection && property.isclass && property.optional) || property.hasOwnProperty("implementingTypes"))
        return tabbing + "if (" + GetPropertySafeName(property) + " != nullptr) delete " + GetPropertySafeName(property) + ";\n";
    return "";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetPropertyCppType(property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;

    if (property.actualtype === "String")
        return "AZStd::string";
    else if (property.actualtype === "Boolean")
        return isOptional ? "OptionalBool" : "bool";
    else if (property.actualtype === "int16")
        return isOptional ? "OptionalInt16" : "Int16";
    else if (property.actualtype === "uint16")
        return isOptional ? "OptionalUint16" : "Uint16";
    else if (property.actualtype === "int32")
        return isOptional ? "OptionalInt32" : "Int32";
    else if (property.actualtype === "uint32")
        return isOptional ? "OptionalUint32" : "Uint32";
    else if (property.actualtype === "int64")
        return isOptional ? "OptionalInt64" : "Int64";
    else if (property.actualtype === "uint64")
        return isOptional ? "OptionalInt64" : "Uint64";
    else if (property.actualtype === "float")
        return isOptional ? "OptionalFloat" : "float";
    else if (property.actualtype === "double")
        return isOptional ? "OptionalDouble" : "double";
    else if (property.actualtype === "DateTime")
        return isOptional ? "OptionalTime" : "time_t";
    else if (property.isclass || property.hasOwnProperty("implementingTypes"))
        return isOptional ? property.actualtype + "*" : property.actualtype; // sub object
    else if (property.isenum)
        return isOptional ? ("Boxed<" + property.actualtype + ">") : property.actualtype; // enum
    else if (property.actualtype === "object")
        return "MultitypeVar";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyDefaultValue(property, datatype) {
    var isOptional = property.optional;
    if (property.collection)
        return "";

    if (property.actualtype === "String")
        return "";
    else if (property.actualtype === "Boolean")
        return isOptional ? "" : "false";
    else if (property.actualtype === "int16")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint16")
        return isOptional ? "" : "0";
    else if (property.actualtype === "int32")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint32")
        return isOptional ? "" : "0";
    else if (property.actualtype === "int64")
        return isOptional ? "" : "0";
    else if (property.actualtype === "uint64")
        return isOptional ? "" : "0";
    else if (property.actualtype === "float")
        return isOptional ? "" : "0";
    else if (property.actualtype === "double")
        return isOptional ? "" : "0";
    else if (property.actualtype === "DateTime")
        return isOptional ? "" : "0";
    else if (property.isclass)
        return isOptional ? "nullptr" : ""; // sub object
    else if (property.isenum)
        return ""; // enum
    else if (property.actualtype === "object")
        return property.hasOwnProperty("implementingtypes") ? "nullptr" : "";
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertyCopyValue(property, datatype) {
    var safePropName = GetPropertySafeName(property);
    if ((property.isclass && property.optional && !property.collection) || property.hasOwnProperty("implementingTypes"))
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : nullptr";
    return "src." + safePropName;
}

function GetPropertySerializer(tabbing, property, datatype) {
    if (property.collection === "array")
        return GetArrayPropertySerializer(tabbing, property, datatype);
    else if (property.collection === "map")
        return GetMapPropertySerializer(tabbing, property, datatype);

    var writer = null;
    var tester = null;

    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    var isOptional = property.optional;

    if (propType === "String") {
        writer = "writer.String(" + safePropName + ".c_str());";
        tester = safePropName + ".length() > 0";
    }
    else if (propType === "Boolean") {
        writer = "writer.Bool(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int16") {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint16") {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int32") {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint32") {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "int64") {
        writer = "writer.Int64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "uint64") {
        writer = "writer.Uint64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "float") {
        writer = "writer.Double(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "double") {
        writer = "writer.Double(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "DateTime") {
        writer = "writeDatetime(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (property.isclass) {
        if (isOptional || property.hasOwnProperty("implementingTypes"))
            writer = safePropName + "->writeJSON(writer);";
        else
            writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + " != nullptr";
    }
    else if (property.isenum) {
        writer = "write" + propType + "EnumJSON(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (propType === "object") {
        writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + ".notNull()";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }

    if (isOptional)
        return tabbing + "if (" + tester + ") {\n"
            + tabbing + "    writer.String(\"" + propName + "\");\n"
            + tabbing + "    " + writer + "\n"
            + tabbing + "}";
    return tabbing + "writer.String(\"" + propName + "\");\n"
        + tabbing + writer;
}

function GetArrayPropertySerializer(tabbing, property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);

    if (property.actualtype === "String")
        writer = "writer.String(iter->c_str());";
    else if (property.actualtype === "Boolean")
        writer = "writer.Bool(*iter);";
    else if (property.actualtype === "int16")
        writer = "writer.Int(*iter);";
    else if (property.actualtype === "uint16")
        writer = "writer.Uint(*iter);";
    else if (property.actualtype === "int32")
        writer = "writer.Int(*iter);";
    else if (property.actualtype === "uint32")
        writer = "writer.Uint(*iter);";
    else if (property.actualtype === "int64")
        writer = "writer.Int64(*iter);";
    else if (property.actualtype === "uint64")
        writer = "writer.Uint64(*iter);";
    else if (property.actualtype === "float")
        writer = "writer.Double(*iter);";
    else if (property.actualtype === "double")
        writer = "writer.Double(*iter);";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime(*iter, writer);";
    else if (property.isclass)
        writer = "iter->writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON(*iter, writer);";
    else if (property.actualtype === "object")
        writer = "iter->writeJSON(writer);";
    else
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;

    var internalTabbing = isOptional ? tabbing + "    " : tabbing;
    var arrayWriter = internalTabbing + "writer.StartArray();\n";
    arrayWriter += internalTabbing + "for (auto iter = " + propName + ".begin(); iter != " + propName + ".end(); iter++) { 	// #THIRD_KIND_PLAYFAB_BEHAVIOUR_CONTEXT: dbowen (2017/08/11) - Change std::list to AZStd::vector because the latter supports reflection to behavior context. \n";
    arrayWriter += internalTabbing + "    " + writer + "\n";
    arrayWriter += internalTabbing + "}\n";
    arrayWriter += internalTabbing + "writer.EndArray();";

    if (isOptional)
        return tabbing + "if (!" + propName + ".empty()) {\n"
            + tabbing + "    writer.String(\"" + propName + "\");\n"
            + arrayWriter + "\n"
            + tabbing + "}";
    return tabbing + "writer.String(\"" + propName + "\");\n"
        + arrayWriter;
}

function GetMapPropertySerializer(tabbing, property, datatype) {
    var writer;
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = GetPropertyCppType(property, datatype, false);

    if (property.actualtype === "String")
        writer = "writer.String(iter->second.c_str());";
    else if (property.actualtype === "Boolean")
        writer = "writer.Bool(iter->second);";
    else if (property.actualtype === "int16")
        writer = "writer.Int(iter->second);";
    else if (property.actualtype === "uint16")
        writer = "writer.Uint(iter->second);";
    else if (property.actualtype === "int32")
        writer = "writer.Int(iter->second);";
    else if (property.actualtype === "uint32")
        writer = "writer.Uint(iter->second);";
    else if (property.actualtype === "int64")
        writer = "writer.Int64(iter->second);";
    else if (property.actualtype === "uint64")
        writer = "writer.Uint64(iter->second);";
    else if (property.actualtype === "float")
        writer = "writer.Double(iter->second);";
    else if (property.actualtype === "double")
        writer = "writer.Double(iter->second);";
    else if (property.actualtype === "DateTime")
        writer = "writeDatetime(iter->second, writer);";
    else if (property.isclass)
        writer = "iter->second.writeJSON(writer);";
    else if (property.isenum)
        writer = "write" + property.actualtype + "EnumJSON(iter->second, writer);";
    else if (property.actualtype === "object")
        writer = "iter->second.writeJSON(writer);";
    else
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;

    var internalTabbing = isOptional ? tabbing + "    " : tabbing;
    var mapWriter = internalTabbing + "writer.StartObject();\n"
        + internalTabbing + "for (std::map<AZStd::string, " + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); ++iter) {\n"
        + internalTabbing + "    writer.String(iter->first.c_str());\n"
        + internalTabbing + "    " + writer + "\n"
        + internalTabbing + "}\n"
        + internalTabbing + "writer.EndObject();";

    if (isOptional)
        return tabbing + "if (!" + propName + ".empty()) {\n"
            + tabbing + "    writer.String(\"" + propName + "\");\n"
            + mapWriter + "\n"
            + tabbing + "}";
    return tabbing + "writer.String(\"" + propName + "\");\n"
        + mapWriter;
}

function GetPropertyDeserializer(tabbing, property, datatype) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);

    if (property.collection === "array")
        return GetArrayPropertyDeserializer(tabbing, property, datatype);
    else if (property.collection === "map")
        return GetMapPropertyDeserializer(tabbing, property, datatype);

    var getter;
    if (propType === "String")
        getter = propName + "_member->value.GetString()";
    else if (propType === "Boolean")
        getter = propName + "_member->value.GetBool()";
    else if (propType === "int16")
        getter = propName + "_member->value.GetInt()";
    else if (propType === "uint16")
        getter = propName + "_member->value.GetUint()";
    else if (propType === "int32")
        getter = propName + "_member->value.GetInt()";
    else if (propType === "uint32")
        getter = propName + "_member->value.GetUint()";
    else if (propType === "int64")
        getter = propName + "_member->value.GetInt64()";
    else if (propType === "uint64")
        getter = propName + "_member->value.GetUint64()";
    else if (propType === "float")
        getter = "(float)" + propName + "_member->value.GetDouble()";
    else if (propType === "double")
        getter = propName + "_member->value.GetDouble()";
    else if (propType === "DateTime")
        getter = "readDatetime(" + propName + "_member->value)";
    else if (property.isclass && property.optional || property.hasOwnProperty("implementingTypes"))
        getter = "new " + propType + "(" + propName + "_member->value)";
    else if (property.isclass && !property.optional)
        getter = propType + "(" + propName + "_member->value)";
    else if (property.isenum)
        getter = "read" + propType + "FromValue(" + propName + "_member->value)";
    else if (propType === "object")
        getter = "MultitypeVar(" + propName + "_member->value)";
    else
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;

    return tabbing + "const Value::ConstMemberIterator " + propName + "_member = obj.FindMember(\"" + propName + "\");\n"
        + tabbing + "if (" + propName + "_member != obj.MemberEnd() && !" + propName + "_member->value.IsNull()) " + safePropName + " = " + getter + ";";
}

function GetArrayPropertyDeserializer(tabbing, property, datatype) {
    var getter;
    if (property.actualtype === "String")
        getter = "memberList[i].GetString()";
    else if (property.actualtype === "Boolean")
        getter = "memberList[i].GetBool()";
    else if (property.actualtype === "int16")
        getter = "memberList[i].GetInt()";
    else if (property.actualtype === "uint16")
        getter = "memberList[i].GetUint()";
    else if (property.actualtype === "int32")
        getter = "memberList[i].GetInt()";
    else if (property.actualtype === "uint32")
        getter = "memberList[i].GetUint()";
    else if (property.actualtype === "int64")
        getter = "memberList[i].GetInt64()";
    else if (property.actualtype === "uint64")
        getter = "memberList[i].GetUint64()";
    else if (property.actualtype === "float")
        getter = "(float)memberList[i].GetDouble()";
    else if (property.actualtype === "double")
        getter = "memberList[i].GetDouble()";
    else if (property.actualtype === "DateTime")
        getter = "readDatetime(memberList[i])";
    else if (property.isclass)
        getter = property.actualtype + "(memberList[i])";
    else if (property.isenum)
        getter = "read" + property.actualtype + "FromValue(memberList[i])";
    else if (property.actualtype === "object")
        getter = "MultitypeVar(memberList[i])";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    return tabbing + "const Value::ConstMemberIterator " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n"
        + tabbing + "if (" + property.name + "_member != obj.MemberEnd()) {\n"
        + tabbing + "    const rapidjson::Value& memberList = " + property.name + "_member->value;\n"
        + tabbing + "    for (SizeType i = 0; i < memberList.Size(); i++) {\n"
        + tabbing + "        " + property.name + ".push_back(" + getter + ");\n"
        + tabbing + "    }\n"
        + tabbing + "}";
}

function GetMapPropertyDeserializer(tabbing, property, datatype) {
    var getter;
    if (property.actualtype === "String")
        getter = "iter->value.GetString()";
    else if (property.actualtype === "Boolean")
        getter = "iter->value.GetBool()";
    else if (property.actualtype === "int16")
        getter = "iter->value.GetInt()";
    else if (property.actualtype === "uint16")
        getter = "iter->value.GetUint()";
    else if (property.actualtype === "int32")
        getter = "iter->value.GetInt()";
    else if (property.actualtype === "uint32")
        getter = "iter->value.GetUint()";
    else if (property.actualtype === "int64")
        getter = "iter->value.GetInt64()";
    else if (property.actualtype === "uint64")
        getter = "iter->value.GetUint64()";
    else if (property.actualtype === "float")
        getter = "(float)iter->value.GetDouble()";
    else if (property.actualtype === "double")
        getter = "iter->value.GetDouble()";
    else if (property.actualtype === "DateTime")
        getter = "readDatetime(iter->value)";
    else if (property.isclass)
        getter = property.actualtype + "(iter->value)";
    else if (property.isenum)
        getter = "read" + property.actualtype + "FromValue(iter->value)";
    else if (property.actualtype === "object")
        getter = "MultitypeVar(iter->value)";
    else
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;

    return tabbing + "const Value::ConstMemberIterator " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n"
        + tabbing + "if (" + property.name + "_member != obj.MemberEnd()) {\n"
        + tabbing + "    for (Value::ConstMemberIterator iter = " + property.name + "_member->value.MemberBegin(); iter != " + property.name + "_member->value.MemberEnd(); ++iter) {\n"
        + tabbing + "        " + property.name + "[iter->name.GetString()] = " + getter + ";\n"
        + tabbing + "    }\n"
        + tabbing + "}";
}

function AddTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;

    if (datatype.properties) {
        for (var p = 0; p < datatype.properties.length; p++) {
            var property = datatype.properties[p];
            if (property.isclass || property.isenum) {
                var dependentType = datatypes[property.actualtype];
                AddTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet);
            }
        }
    }

    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

function GenerateModels(apis, sourceDir, apiOutputDir, gemName) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];

        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};

        for (var i in api.datatypes)
            AddTypeAndDependencies(api.datatypes[i], api.datatypes, orderedTypes, addedSet);

        var modelLocals = {
            api: api,
            datatypes: orderedTypes,
            gemName: gemName,
            GetDatatypeBaseType: GetDatatypeBaseType,
            GetPropertyDef: GetPropertyDef,
            GetPropertySerializer: GetPropertySerializer,
            GetPropertyDeserializer: GetPropertyDeserializer,
            GetPropertyDefaultValue: GetPropertyDefaultValue,
            GetPropertyCopyValue: GetPropertyCopyValue,
            GetPropertySafeName: GetPropertySafeName,
            GetPropertyDestructor: GetPropertyDestructor
        };

        var modelHeaderTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFab_DataModels.h.ejs"));
        writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFab" + api.name + "DataModels.h"), modelHeaderTemplate(modelLocals));
    }

    var modelHeaderTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFabBaseModel.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFabBaseModel.h"), modelHeaderTemplate(modelLocals));
}

function GenerateErrors(api, sourceDir, apiOutputDir, gemName) {
    var errorLocals = {
        errorList: api.errorList,
        errors: api.errors
    };

    var errorsTemplate = GetCompiledTemplate(path.resolve(sourceDir, "templates/Code/Include/PlayFab_Sdk/PlayFabError.h.ejs"));
    writeFile(path.resolve(apiOutputDir, "Code/Include/PlayFab" + gemName + "Sdk/PlayFabError.h"), errorsTemplate(errorLocals));
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "\"X-SecretKey\", PlayFabSettings::playFabSettings->developerSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "\"X-Authorization\", mUserSessionTicket";
    return "\"\", \"\"";
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest"))
        return "    if (PlayFabSettings::playFabSettings->titleId.length() > 0)\n        request.TitleId = PlayFabSettings::playFabSettings->titleId;\n";
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult"))
        return "        if (outResult->SessionTicket.length() > 0)\n"
            + "        {\n"
            + "            PlayFabClientApi::mUserSessionTicket = outResult->SessionTicket;\n"
            + "        }\n"
            + "        MultiStepClientLogin(outResult->SettingsForUser->NeedsAttribution);\n";
    else if (api.name === "Client" && apiCall.result === "AttributeInstallResult")
        return "        // Modify advertisingIdType:  Prevents us from sending the id multiple times, and allows automated tests to determine id was sent successfully\n"
            + "        PlayFabSettings::playFabSettings->advertisingIdType += \"_Successful\";\n";
    return "";
}
