var path = require("path");
var ejs = require("ejs");

exports.makeClientAPI = function (api, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Client SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    MakeUnrealApi([api], apiOutputDir, sourceDir, "Client");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor([api], apiOutputDir, sourceDir);
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

exports.makeServerAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Server SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    MakeUnrealApi(apis, apiOutputDir, sourceDir, "Server");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor(apis, apiOutputDir, sourceDir);
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

exports.makeCombinedAPI = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating Unreal Engine Combined SDK to " + apiOutputDir);
    
    // Copy over the standard source files to the plugin destination
    copyTree(path.resolve(sourceDir, "Source"), path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source"));
    // Copy over the standard plugin files including resources, content, and readme
    copyTree(path.resolve(sourceDir, "StandardPluginFiles"), path.resolve(apiOutputDir, "PluginFiles/PlayFab"));
    // Make the variable api files
    MakeUnrealApi(apis, apiOutputDir, sourceDir, "All");
    
    // Now copy over the example project and then put the plugin folder in the right spot
    MakePfTestActor(apis, apiOutputDir, sourceDir);
    copyTree(path.resolve(sourceDir, "ExampleProject"), path.resolve(apiOutputDir, "ExampleProject"));
    copyTree(path.resolve(apiOutputDir, "PluginFiles"), path.resolve(apiOutputDir, "ExampleProject/Plugins"));
}

function MakeUnrealApi(apis, apiOutputDir, sourceDir, libname) {
    // Create the uplugin file
    var apiLocals = {};
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.libname = libname;
    apiLocals.apis = apis;
    
    var apiUpluginTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.uplugin.ejs")));
    var generatedUplugin = apiUpluginTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/PlayFab.uplugin"), generatedUplugin);
    
    var apiPlayFabUtilitiesHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.h.ejs")));
    var generatedUtilitiesH = apiPlayFabUtilitiesHTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabUtilities.h"), generatedUtilitiesH);
    
    var apiPlayFabUtilitiesCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabUtilities.cpp.ejs")));
    var generatedUtilitiesCpp = apiPlayFabUtilitiesCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFabUtilities.cpp"), generatedUtilitiesCpp);
    
    var pfcppLocals = {};
    pfcppLocals.sdkVersion = exports.sdkVersion;
    pfcppLocals.names = [];
    for (var a1 = 0; a1 < apis.length; a1++) {
        pfcppLocals.names[a1] = {};
        pfcppLocals.names[a1].name = apis[a1].name;
    }
    var apiPlayFabCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFab.cpp.ejs")));
    var generatedPlayFabCpp = apiPlayFabCppTemplate(pfcppLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab.cpp"), generatedPlayFabCpp);
    
    for (var a2 = 0; a2 < apis.length; a2++)
        MakeApiFiles(apis[a2], apiOutputDir, sourceDir, libname);
    MakeSimpleFiles(apis, apiOutputDir, sourceDir);
}

function MakePfTestActor(apis, apiOutputDir, sourceDir) {
    var testLocals = {};
    testLocals.hasServerOptions = false;
    testLocals.hasClientOptions = false;
    testLocals.sdkVersion = exports.sdkVersion;
    for (var i = 0; i < apis.length; i++) {
        if (apis[i].name === "Client")
            testLocals.hasClientOptions = true;
        else
            testLocals.hasServerOptions = true;
    }
    var testTemplateH = ejs.compile(readFile(path.resolve(sourceDir, "templates/PfTestActor.h.ejs")));
    var generatedH = testTemplateH(testLocals);
    writeFile(path.resolve(apiOutputDir, "ExampleProject/Plugins/PlayFab/Source/PlayFab/Classes/PfTestActor.h"), generatedH);
    
    var testTemplateCpp = ejs.compile(readFile(path.resolve(sourceDir, "templates/PfTestActor.cpp.ejs")));
    var generatedCpp = testTemplateCpp(testLocals);
    writeFile(path.resolve(apiOutputDir, "ExampleProject/Plugins/PlayFab/Source/PlayFab/Private/PfTestActor.cpp"), generatedCpp);
}

// Create Enums, .h file
function MakeSimpleFiles(apis, apiOutputDir, sourceDir) {
    var enumLocals = {
        "enumTypes": CollectEnumsFromApis(apis)
    }
    var enumTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabEnums.h.ejs")));
    var genEnums = enumTemplate(enumLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFabEnums.h"), genEnums);
    
    var settingLocals = {
        "sdkVersion": exports.sdkVersion,
        "buildIdentifier": exports.buildIdentifier
    }
    var settingsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/IPlayFab.h.ejs")));
    var genSettings = settingsTemplate(settingLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Public/IPlayFab.h"), genSettings);
}

// Pull all the enums out of all the apis, and collect them into a single collection of just the enum types and filter duplicates
function CollectEnumsFromApis(apis) {
    var enumTypes = {};
    for (var i = 0; i < apis.length; i++)
        for (var dataTypeName in apis[i].datatypes)
            if (apis[i].datatypes[dataTypeName].isenum)
                enumTypes[dataTypeName] = apis[i].datatypes[dataTypeName];
    return enumTypes;
}

// Create Models, .h and .cpp files
function MakeApiFiles(api, apiOutputDir, sourceDir, libname) {
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var apiCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
    var apiPlayFabModelTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.h.ejs")));
    var apiPlayFabModelCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModels.cpp.ejs")));
    var apiPlayFabModelDecoderHTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.h.ejs")));
    var apiPlayFabModelDecoderCppTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabModelDecoder.cpp.ejs")));
    
    var generatedHeader;
    var generatedBody;
    var apiLocals = {};
    apiLocals.GetPropertyCppType = GetPropertyCppType;
    apiLocals.GenerateSummary = GenerateSummary;
    apiLocals.GetPropertySerialization = GetPropertySerialization;
    apiLocals.GetPropertyDeserialization = GetPropertyDeserialization;
    apiLocals.api = api;
    apiLocals.hasClientOptions = api.name === "Client";
    apiLocals.sdkVersion = exports.sdkVersion;
    apiLocals.libname = libname;
    
    generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "API.h"), generatedHeader);
    generatedBody = apiCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "API.cpp"), generatedBody);
    
    generatedHeader = apiPlayFabModelTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "Models.h"), generatedHeader);
    generatedBody = apiPlayFabModelCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "Models.cpp"), generatedBody);
    
    generatedHeader = apiPlayFabModelDecoderHTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Classes/PlayFab" + api.name + "ModelDecoder.h"), generatedHeader);
    generatedBody = apiPlayFabModelDecoderCppTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PluginFiles/PlayFab/Source/PlayFab/Private/PlayFab" + api.name + "ModelDecoder.cpp"), generatedBody);
}

function GetPropertySafeName(property) {
    // Turns out we didn't need this at the time it was added, but it's a good pattern
    return property.name;
}

function GetPropertyCppType(property, datatype) {
    var propSafeName = GetPropertySafeName(property);
    var isCollection = property.hasOwnProperty("collection");
    var isArray = isCollection && property.collection === "array";
    
    switch (property.jsontype) {
        case "String":
            if (isCollection && isArray) {
                return "FString " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else if (property.isenum) {
                return "E" + property.actualtype + " " + propSafeName + ";";
            } else {
                return "FString " + propSafeName + ";";
            }
        case "Boolean":
            if (isCollection && isArray) {
                return "TArray<bool> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else {
                return "bool " + propSafeName + ";";
            }
        case "Number":
            if (isCollection && isArray) {
                return "TArray<int32> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else {
                return "int32 " + propSafeName + ";";
            }
        case "Object":
            if (isCollection && isArray) {
                return "TArray<UPlayFabJsonObject*> " + propSafeName + ";";
            } else if (isCollection) {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            } else {
                return "UPlayFabJsonObject* " + propSafeName + ";";
            }
    }
    
    throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
}

function GetPropertySerialization(tabbing, property, datatype) {
    var propSafeName = GetPropertySafeName(property);
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
                    + tabbing + "if (GetEnumValueToString<E" + property.actualtype + ">(TEXT(\"E" + property.actualtype + "\"), request." + propSafeName + ", temp_" + propSafeName + "))\n" 
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

function GetPropertyDeserialization(tabbing, property, datatype) {
    var propSafeName = GetPropertySafeName(property);
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
                return tabbing + "GetEnumValueFromString<E" + property.actualtype + ">(TEXT(\"E" + property.actualtype + "\"), dataObj->GetStringField(\"" + property.name + "\"), tempStruct." + propSafeName + ");";
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

function GenerateSummary(tabbing, element, summaryParam) {
    if (!element.hasOwnProperty(summaryParam)) {
        return "";
    }
    
    return tabbing + "/** " + element[summaryParam] + " */\n";
}
