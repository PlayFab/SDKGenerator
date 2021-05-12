var path = require("path");

// Making resharper less noisy - These are defined in Generate.js
if (typeof (copyTree) === "undefined") copyTree = function () { };
if (typeof (getCompiledTemplate) === "undefined") getCompiledTemplate = function () { };

exports.makeClientAPI2 = function (apis, sourceDir, apiOutputDir) {
    console.log("Generating client api from: " + sourceDir + " to: " + apiOutputDir);
    for (var i = 0; i < apis.length; i++)
        makeApiInternal(apis[i], sourceDir, apiOutputDir);
}

function makeApiInternal(api, sourceDir, apiOutputDir) {
    var apiLocals = {
        api: api,
        authKey: api.name === "Client",
        GetAuthParams: GetAuthParams,
        GetRequestActions: GetRequestActions,
        GetResultActions: GetResultActions,
        HasRequest: HasRequest,
        GetDefaultVerticalName: GetDefaultVerticalName,
    };

    GenerateModels([api], apiOutputDir, api.name, sourceDir, "");
    GenerateErrors(api, apiOutputDir, sourceDir);
    GenerateVersion(api, apiOutputDir, sourceDir);

    var apiHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs"));
    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK/PlayFab" + api.name + "API.h"), generatedHeader);

    var apiBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabAPI.m.ejs"));
    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK/PlayFab" + api.name + "API.m"), generatedBody);

    copyTree(path.resolve(sourceDir, "source"), path.resolve(apiOutputDir, "PlayFabSDK"));
}

function GetAuthParams(apiCall) {
    if (apiCall.auth === "SecretKey")
        return "authType:@\"X-SecretKey\" authKey:PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth === "SessionTicket")
        return "authType:@\"X-Authorization\" authKey:self.mUserSessionTicket";
    
    return "authType:nil authKey:nil";
}

function GetPropertyAttribs(property, datatype, api) {
    return "";
}

function HasRequest(apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

function GetPropertyDef(property, datatype, api) {
    //var propType = property.actualtype;
    //var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return "NSArray* " + safePropName + ";";
    else if (property.collection === "map")
        return "NSDictionary* " + safePropName + ";";
    else
        return GetPropertyCppType(property, datatype, true, api) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
function GetPropertySafeName(property) {
    return (property.actualtype === property.name) ? "pf" + property.name : property.name;
}

function GetPropertyCppType(property, datatype, needOptional, api) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype === "String") {
        return "NSString*";
    }
    else if (property.actualtype === "Boolean") {
        return "bool";
    }
    else if (property.actualtype === "int16") {
        return "NSNumber*";
    }
    else if (property.actualtype === "uint16") {
        return "NSNumber*";
    }
    else if (property.actualtype === "int32") {
        return "NSNumber*";
    }
    else if (property.actualtype === "uint32") {
        return "NSNumber*";
    }
    else if (property.actualtype === "int64") {
        return "NSNumber*";
    }
    else if (property.actualtype === "uint64") {
        return "NSNumber*";
    }
    else if (property.actualtype === "float") {
        return "NSNumber*";
    }
    else if (property.actualtype === "double") {
        return "NSNumber*";
    }
    else if (property.actualtype === "DateTime") {
        return "NSDate*";
    }
    else if (property.isclass) {
        return isOptional ? api.name + property.actualtype + "*" : api.name + property.actualtype + "*"; // sub object
    }
    else if (property.isenum) {
        return api.name + property.actualtype; // enum
    }
    else if (property.actualtype === "object") {
        return "NSDictionary*";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

function GetPropertyDefaultValue(property, datatype) {
    var isOptional = property.optional;
    if (property.collection)
        return "";
    
    if (property.actualtype === "String") {
        return "";
    }
    else if (property.actualtype === "Boolean") {
        return isOptional ? "" : "false";
    }
    else if (property.actualtype === "int16") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "uint16") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "int32") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "uint32") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "int64") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "uint64") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "float") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "double") {
        return isOptional ? "" : "0";
    }
    else if (property.actualtype === "DateTime") {
        return isOptional ? "" : "0";
    }
    else if (property.isclass) {
        return isOptional ? "NULL" : ""; // sub object
    }
    else if (property.isenum) {
        return ""; // enum
    }
    else if (property.actualtype === "object") {
        return "";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

function GetPropertyCopyValue(property, datatype) {
    var safePropName = GetPropertySafeName(property);
    
    if (property.isclass && property.optional && !property.collection) {
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : NULL";
    }
    return "src." + safePropName;
}

function GetPropertyDeserializer(property, datatype, api) {
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = GetPropertySafeName(property);
    
    if (property.collection === "array")
        return GetArrayPropertyDeserializer(property, datatype, api);
    else if (property.collection === "map")
        return GetMapPropertyDeserializer(property, datatype, api);
    
    var getter;
    if (propType === "String") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "Boolean") {
        getter = "[[properties valueForKey:@\"" + propName + "\"] boolValue];";
    }
    else if (propType === "int16") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "uint16") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "int32") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "uint32") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "int64") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "uint64") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "float") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "double") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else if (propType === "DateTime") {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[properties valueForKey:@\"" + propName + "\"]];";
    }
    else if (property.isclass) {
        getter = "[[" + api.name + propType + " new] initWithDictionary:[properties objectForKey:@\"" + propName + "\"]];";
    }
    else if (property.isenum) {
        getter = "(" + api.name + property.actualtype + ")" + "[properties valueForKey:@\"" + api.name + propName + "\"];";
    }
    else if (propType === "object") {
        getter = "[properties valueForKey:@\"" + propName + "\"];";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }
    
    return "self." + safePropName + " = " + getter;
}
function GetArrayPropertyDeserializer(property, datatype, api) {
    var getter;
    
    var propType = property.actualtype;
    if (propType === "String") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "Boolean") {
        getter = "[[member_list objectAtIndex:i] boolValue]";
    }
    else if (propType === "int16") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "uint16") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "int32") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "uint32") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "int64") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "uint64") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "float") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "double") {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType === "DateTime") {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[member_list objectAtIndex:i]]";
    }
    else if (property.isclass) {
        getter = "[[" + api.name +  property.actualtype + " new] initWithDictionary:[member_list objectAtIndex:i]]";
    }
    else if (property.isenum) {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (property.actualtype === "object") {
        getter = "[member_list objectAtIndex:i]";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    var val = "if ([properties objectForKey:@\"" + property.name + "\"]){\n";
    val += "    NSArray* member_list = [properties objectForKey:@\"" + property.name + "\"];\n";
    val += "    NSMutableArray* mutable_storage = [NSMutableArray new];\n";
    val += "    for(int i=0;i<[member_list count];i++){\n";
    val += "        [mutable_storage addObject:" + getter + "];\n";
    val += "    }\n";
    val += "    self." + property.name + " = [mutable_storage copy];\n";
    val += "}\n";
    
    return val;
}

function GetMapPropertyDeserializer(property, datatype, api) {
    var getter;
    
    var propType = property.actualtype;
    
    if (propType === "String") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "Boolean") {
        getter = "[[member_list objectForKey:key] boolValue]";
    }
    else if (propType === "int16") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "uint16") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "int32") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "uint32") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "int64") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "uint64") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "float") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "double") {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType === "DateTime") {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[member_list objectForKey:key]]";
    }
    else if (property.isclass) {
        getter = "[[" + api.name +  property.actualtype + " new] initWithDictionary:[member_list objectForKey:key]]";
    }
    else if (property.isenum) {
        getter = "(" + api.name +  property.actualtype + ")" + "[member_list objectForKey:key]";
    }
    else if (property.actualtype === "object") {
        getter = "[member_list objectForKey:key]";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    var val = "if ([properties objectForKey:@\"" + property.name + "\"]){\n";
    val += "    NSDictionary* member_list = [properties objectForKey:@\"" + property.name + "\"];\n";
    val += "    NSMutableDictionary* mutable_storage = [NSMutableDictionary new];\n";
    val += "    for(NSString* key in member_list){\n";
    val += "        [mutable_storage setValue:" + getter + " forKey:key];\n";
    val += "    }\n";
    val += "    self." + property.name + " = [mutable_storage copy];\n";
    val += "}\n";
    
    return val;
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

function GenerateModels(apis, apiOutputDir, libraryName, sourceDir, subdir) {
    for (var a = 0; a < apis.length; a++) {
        var api = apis[a];
        
        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        
        for (var i in api.datatypes) {
            var datatype = api.datatypes[i];
            AddTypeAndDependencies(datatype, api.datatypes, orderedTypes, addedSet);
        }
        
        var modelHeaderTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs"));
        var modelBodyTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabDataModels.m.ejs"));
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.GetPropertyDef = GetPropertyDef;
        
        modelLocals.GetPropertyAttribs = GetPropertyAttribs;
        modelLocals.GetPropertyDeserializer = GetPropertyDeserializer;
        modelLocals.GetPropertyDefaultValue = GetPropertyDefaultValue;
        modelLocals.GetPropertyCopyValue = GetPropertyCopyValue;
        modelLocals.isResultHandler = GetIsResultHandler;
        modelLocals.GetPropertySafeName = GetPropertySafeName;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFabSDK/PlayFab" + api.name + "DataModels.h"), generatedHeader);
        
        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "PlayFabSDK/" + subdir + "PlayFab" + api.name + "DataModels.m"), generatedBody);
    }
}

function GetIsResultHandler(datatype) {
    return (datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1);
}

function GenerateVersion(api, apiOutputDir, sourceDir) {
    var versionTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabVersion.m.ejs"));
    
    var versionLocals = {};
    versionLocals.sdkVersion = sdkGlobals.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK/PlayFabVersion.m"), generatedVersion);
}

function GenerateErrors(api, apiOutputDir, sourceDir) {
    var errorsTemplate = getCompiledTemplate(path.resolve(sourceDir, "templates/PlayFabError.h.ejs"));
    
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "PlayFabSDK/PlayFabError.h"), generatedErrors);
}

function GetRequestActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.request === "RegisterPlayFabUserRequest")) {
        var val = "if ([PlayFabSettings.TitleId length] > 0)\n        request.TitleId = PlayFabSettings.TitleId;\n";
        
        if (apiCall.request === "LoginWithIOSDeviceIDRequest") {
            val += "//Get iOS device and os information:\n";
            val += "NSOperatingSystemVersion version = [[NSProcessInfo processInfo] operatingSystemVersion];\n";
            val += "request.OS = [NSString stringWithFormat:@\"%d.%d.%d\", version.majorVersion, version.minorVersion, version.patchVersion];\n";
            val += "request.DeviceId = [[[UIDevice currentDevice] identifierForVendor] UUIDString];\n";
            val += "request.DeviceModel = [PlayFabClientAPI getModel];\n";
        }
        
        return val;
    }
    return "";
}

function GetResultActions(apiCall, api) {
    if (api.name === "Client" && (apiCall.result === "LoginResult" || apiCall.result === "RegisterPlayFabUserResult")) {
        var val = "if ([class_data valueForKey:@\"SessionTicket\"])\n            self.mUserSessionTicket = [class_data valueForKey:@\"SessionTicket\"];\n";
        return val;
    }
    return "";
}

function GetDefaultVerticalName() {
    if (exports.verticalName)
    {
        return exports.verticalName;
    }
    return "";
}
