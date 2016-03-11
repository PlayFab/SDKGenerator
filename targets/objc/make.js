var path = require('path');


var makeAPI = exports.makeClientAPI = function (api, apiOutputDir, subdir) {
    var sourceDir = __dirname;

            console.log(" PlayFabAPI.h ");

    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
            console.log(" PlayFabAPI.m ");
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.m.ejs")));
    
   //         console.log(" PlayFabDataModels.h ");
   // var apiDataModelsH = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs")));
   //         console.log(" PlayFabDataModels.m ");
   // var apiDataModelsM = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.m.ejs")));
    
   //         console.log(" PlayFabError ");
   // var apiError = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabError.h.ejs")));
    //        console.log(" PlayFabVersion ");
    //var apiVersion = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.m.ejs")));

    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.getAuthParams = getAuthParams;
    //apiLocals.getProtocolType = getProtocolType;
    apiLocals.authKey = api.name == "Client";
    apiLocals.hasRequest = hasRequest;
    

    generateModels([api], apiOutputDir, api.name, "");
    generateErrors(api, apiOutputDir );
    generateVersion(api, apiOutputDir );

    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "output/PlayFab" + api.name + "API.h"), generatedHeader);

    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "output/PlayFab" + api.name + "API.m"), generatedBody);
    
}

var makeAPI = exports.makeAPI = function (api, apiOutputDir, subdir) {
    var sourceDir = __dirname;
    
    var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
    var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.m.ejs")));
    
    var apiLocals = {};
    apiLocals.api = api;
    apiLocals.getRequestActions = getRequestActions;
    apiLocals.getResultActions = getResultActions;
    apiLocals.authKey = api.name == "Client";
    apiLocals.getAuthParams = getAuthParams;
    apiLocals.hasRequest = hasRequest;
    
    var generatedHeader = apiHeaderTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "output/PlayFab" + api.name + "API.h"), generatedHeader);
    
    var generatedBody = apiBodyTemplate(apiLocals);
    writeFile(path.resolve(apiOutputDir, "source/" + subdir + "PlayFab" + api.name + "API.m"), generatedBody);
}

var getAuthParams = exports.getAuthParams = function (apiCall) {
    if (apiCall.auth == 'SecretKey')
        return "authType:@\"X-SecretKey\" authKey:PlayFabSettings.DeveloperSecretKey";
    else if (apiCall.auth == 'SessionTicket')
        return "authType:@\"X-Authorization\" authKey:self.mUserSessionTicket";
    
    return "authType:nil authKey:nil";
}

function getPropertyAttribs(property, datatype, api) {
    return "";
}

var hasRequest = exports.hasRequest = function (apiCall, api) {
    var requestType = api.datatypes[apiCall.request];
    return requestType.properties.length > 0;
}

var getPropertyDef = exports.getPropertyDef = function (property, datatype) {
    
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    
    if (property.collection == "array")
        //return "std::list<" + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
        return "NSArray* " + safePropName + ";";
    else if (property.collection == "map")
        //return "std::map<std::string, " + getPropertyCPPType(property, datatype, false) + "> " + safePropName + ";";
        return "NSDictionary* " + safePropName + ";";
    else
        return getPropertyCPPType(property, datatype, true) + " " + safePropName + ";";
}

// PFWORKBIN-445 & PFWORKBIN-302 - variable names can't be the same as the variable type when compiling for android
var getPropertySafeName = exports.getPropertySafeName = function (property) {
    return (property.actualtype == property.name) ? "pf" + property.name : property.name;
}

var getProtocolType = exports.getProtocolType = function (property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype == 'String') {
        return 'NSString';
    }
    else if (property.actualtype == 'Boolean') {
        return isOptional ? 'bool' : 'bool'; //OptionalBool
    }
    else if (property.actualtype == 'int16') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'uint16') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'int32') {
        return isOptional ? 'NSNumber' : 'NSNumber';
        //return isOptional ? 'OptionalInt32' : 'int32_t';
    }
    else if (property.actualtype == 'uint32') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'int64') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'uint64') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'float') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'double') {
        return isOptional ? 'NSNumber' : 'NSNumber';
    }
    else if (property.actualtype == 'DateTime') {
        return isOptional ? 'NSDate' : 'NSDate';
    }
    else if (property.isclass) {
        return isOptional ? property.actualtype : property.actualtype; // sub object
    }
    else if (property.isenum) {
        return isOptional ? property.actualtype : property.actualtype; // enum
    }
    else if (property.actualtype == "object") {
        return "NSDictionary";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

var getPropertyCPPType = exports.getPropertyCPPType = function (property, datatype, needOptional) {
    var isOptional = property.optional && needOptional;
    
    if (property.actualtype == 'String') {
        return 'NSString*';
    }
    else if (property.actualtype == 'Boolean') {
        return isOptional ? 'bool' : 'bool'; //OptionalBool
    }
    else if (property.actualtype == 'int16') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'uint16') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'int32') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
        //return isOptional ? 'OptionalInt32' : 'int32_t';
    }
    else if (property.actualtype == 'uint32') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'int64') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'uint64') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'float') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'double') {
        return isOptional ? 'NSNumber*' : 'NSNumber*';
    }
    else if (property.actualtype == 'DateTime') {
        return isOptional ? 'NSDate*' : 'NSDate*';
    }
    else if (property.isclass) {
        return isOptional ? property.actualtype + '*' : property.actualtype; // sub object
    }
    else if (property.isenum) {
        return isOptional ? property.actualtype : property.actualtype; // enum
    }
    else if (property.actualtype == "object") {
        return "NSDictionary*";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

var getPropertyDefaultValue = exports.getPropertyDefaultValue = function (property, datatype) {
    var isOptional = property.optional;
    if (property.collection)
        return '';
    
    if (property.actualtype == 'String') {
        return "";
    }
    else if (property.actualtype == 'Boolean') {
        return isOptional ? '' : 'false';
    }
    else if (property.actualtype == 'int16') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'uint16') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'int32') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'uint32') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'int64') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'uint64') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'float') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'double') {
        return isOptional ? '' : '0';
    }
    else if (property.actualtype == 'DateTime') {
        return isOptional ? '' : '0';
    }
    else if (property.isclass) {
        return isOptional ? 'NULL' : ''; // sub object
    }
    else if (property.isenum) {
        return isOptional ? '' : ''; // enum
    }
    else if (property.actualtype == "object") {
        return '';
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
}

var getPropertyCopyValue = exports.getPropertyCopyValue = function (property, datatype) {
    var safePropName = getPropertySafeName(property);
    
    if (property.isclass && property.optional && !property.collection) {
        return "src." + safePropName + " ? new " + property.actualtype + "(*src." + safePropName + ") : NULL";
    }
    return "src." + safePropName;
}
/*
var getPropertySerializer = exports.getPropertySerializer = function (property, datatype) {
    if (property.collection == "array")
        return getArrayPropertySerializer(property, datatype);
    else if (property.collection == "map")
        return getMapPropertySerializer(property, datatype);
    
    var writer = null;
    var tester = null;
    
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    var isOptional = property.optional;
    
    if (propType == 'String') {
        writer = "writer.String(" + safePropName + ".c_str());";
        tester = safePropName + ".length() > 0";
    }
    else if (propType == 'Boolean') {
        writer = "writer.Bool(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'int16') {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'uint16') {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'int32') {
        writer = "writer.Int(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'uint32') {
        writer = "writer.Uint(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'int64') {
        writer = "writer.Int64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'uint64') {
        writer = "writer.Uint64(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'float') {
        writer = "writer.Double(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'double') {
        writer = "writer.Double(" + safePropName + ");";
        tester = safePropName + ".notNull()";
    }
    else if (propType == 'DateTime') {
        writer = "writeDatetime(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (property.isclass) {
        if (isOptional)
            writer = safePropName + "->writeJSON(writer);";
        else
            writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + " != NULL";
    }
    else if (property.isenum) {
        writer = "write" + propType + "EnumJSON(" + safePropName + ", writer);";
        tester = safePropName + ".notNull()";
    }
    else if (propType == "object") {
        writer = safePropName + ".writeJSON(writer);";
        tester = safePropName + ".notNull()";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }
    
    if (isOptional) {
        return "if(" + tester + ") { writer.String(\"" + propName + "\"); " + writer + " }";
    }
    else {
        return "writer.String(\"" + propName + "\"); " + writer;
    }
}

var getArrayPropertySerializer = exports.getArrayPropertySerializer = function (property, datatype) {
    var writer = null;
    
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);
    
    if (property.actualtype == 'String') {
        writer = "writer.String(iter->c_str());";
    }
    else if (property.actualtype == 'Boolean') {
        writer = "writer.Bool(*iter);";
    }
    else if (property.actualtype == 'int16') {
        writer = "writer.Int(*iter);";
    }
    else if (property.actualtype == 'uint16') {
        writer = "writer.Uint(*iter);";
    }
    else if (property.actualtype == 'int32') {
        writer = "writer.Int(*iter);";
    }
    else if (property.actualtype == 'uint32') {
        writer = "writer.Uint(*iter);";
    }
    else if (property.actualtype == 'int64') {
        writer = "writer.Int64(*iter);";
    }
    else if (property.actualtype == 'uint64') {
        writer = "writer.Uint64(*iter);";
    }
    else if (property.actualtype == 'float') {
        writer = "writer.Double(*iter);";
    }
    else if (property.actualtype == 'double') {
        writer = "writer.Double(*iter);";
    }
    else if (property.actualtype == 'DateTime') {
        writer = "writeDatetime(*iter, writer);";
    }
    else if (property.isclass) {
        writer = "iter->writeJSON(writer);";
    }
    else if (property.isenum) {
        writer = "write" + property.actualtype + "EnumJSON(*iter, writer);";
    }
    else if (property.actualtype == "object") {
        writer = "iter->writeJSON(writer);";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;
    }
    
    
    var collectionWriter = "writer.StartArray();\n\t";
    collectionWriter += "for (std::list<" + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); iter++) {\n\t\t";
    collectionWriter += writer + "\n\t}\n\t";
    collectionWriter += "writer.EndArray();\n\t";
    
    if (isOptional) {
        return "if(!" + propName + ".empty()) {\n\twriter.String(\"" + propName + "\");\n\t" + collectionWriter + " }";
    }
    else {
        return "writer.String(\"" + propName + "\");\n\t" + collectionWriter;
    }
}


var getMapPropertySerializer = exports.getMapPropertySerializer = function (property, datatype) {
    var writer = null;
    
    var propName = property.name;
    var isOptional = property.optional;
    var cppType = getPropertyCPPType(property, datatype, false);
    
    if (property.actualtype == 'String') {
        writer = "writer.String(iter->second.c_str());";
    }
    else if (property.actualtype == 'Boolean') {
        writer = "writer.Bool(iter->second);";
    }
    else if (property.actualtype == 'int16') {
        writer = "writer.Int(iter->second);";
    }
    else if (property.actualtype == 'uint16') {
        writer = "writer.Uint(iter->second);";
    }
    else if (property.actualtype == 'int32') {
        writer = "writer.Int(iter->second);";
    }
    else if (property.actualtype == 'uint32') {
        writer = "writer.Uint(iter->second);";
    }
    else if (property.actualtype == 'int64') {
        writer = "writer.Int64(iter->second);";
    }
    else if (property.actualtype == 'uint64') {
        writer = "writer.Uint64(iter->second);";
    }
    else if (property.actualtype == 'float') {
        writer = "writer.Double(iter->second);";
    }
    else if (property.actualtype == 'double') {
        writer = "writer.Double(iter->second);";
    }
    else if (property.actualtype == 'DateTime') {
        writer = "writeDatetime(iter->second, writer);";
    }
    else if (property.isclass) {
        writer = "iter->second.writeJSON(writer);";
    }
    else if (property.isenum) {
        writer = "write" + property.actualtype + "EnumJSON(iter->second, writer);";
    }
    else if (property.actualtype == "object") {
        writer = "iter->second.writeJSON(writer);";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + propName + " in " + datatype.name;
    }
    
    var collectionWriter = "writer.StartObject();\n\t";
    collectionWriter += "for (std::map<std::string, " + cppType + ">::iterator iter = " + propName + ".begin(); iter != " + propName + ".end(); ++iter) {\n\t\t";
    collectionWriter += "writer.String(iter->first.c_str()); " + writer + "\n\t}\n\t";
    collectionWriter += "writer.EndObject();\n\t";
    
    if (isOptional) {
        return "if(!" + propName + ".empty()) {\n\twriter.String(\"" + propName + "\");\n\t" + collectionWriter + "}";
    }
    else {
        return "writer.String(\"" + propName + "\");\n\t" + collectionWriter;
    }
}
*/

var getPropertyDeserializer = exports.getPropertyDeserializer = function (property, datatype) {
    
    var propType = property.actualtype;
    var propName = property.name;
    var safePropName = getPropertySafeName(property);
    var isOptional = property.optional;
    
    if (property.collection == "array")
        return getArrayPropertyDeserializer(property, datatype);
    else if (property.collection == "map")
        return getMapPropertyDeserializer(property, datatype);
    
    var getter = null;
    
    if (propType == 'String') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'Boolean') {
        getter = "[[properties valueForKey:@\""+propName+"\"] boolValue];";
    }
    else if (propType == 'int16') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'uint16') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'int32') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'uint32') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'int64') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'uint64') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'float') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'double') {
        getter = "[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == 'DateTime') {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[properties valueForKey:@\""+propName+"\"]];";
    }
    else if (property.isclass) {
        if (property.optional)
            //getter = "["+propType+" new];";
            getter = "[["+propType+" new] initWithDictionary:[properties objectForKey:@\""+propName+"\"]];";
        else
            getter = "[["+propType+" new] initWithDictionary:[properties objectForKey:@\""+propName+"\"]];";

    }
    else if (property.isenum) {
        //getter = "read" + propType + "FromValue(" + propName + "_member->value)";

        getter = "("+property.actualtype+")"+"[properties valueForKey:@\""+propName+"\"];";
    }
    else if (propType == "object") {
        getter = "[properties valueForKey:@\""+propName+"\"];";
        //getter = "MultitypeVar(" + propName + "_member->value)";
    }
    else {
        throw "Unknown property type: " + propType + " for " + propName + " in " + datatype.name;
    }
    
    //var val = "const Value::Member* " + propName + "_member = obj.FindMember(\"" + propName + "\");\n";
    //val += "\tif (" + propName + "_member != NULL && !" + propName + "_member->value.IsNull()) " + safePropName + " = " + getter + ";"
    
    var val = "self."+safePropName+" = "+getter;

    return val;
}
var getArrayPropertyDeserializer = exports.getArrayPropertyDeserializer = function (property, datatype) {
    var getter = null;
    
    var propType = property.actualtype;
    if (propType == 'String') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'Boolean') {
        getter = "[[member_list objectAtIndex:i] boolValue]";
    }
    else if (propType == 'int16') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'uint16') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'int32') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'uint32') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'int64') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'uint64') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'float') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'double') {
        getter = "[member_list objectAtIndex:i]";
    }
    else if (propType == 'DateTime') {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[member_list objectAtIndex:i]]";
    }
    else if (property.isclass) {
        getter = "[["+property.actualtype+" new] initWithDictionary:[member_list objectAtIndex:i]]";
    }
    else if (property.isenum) {
        getter = "("+property.actualtype+")"+"[member_list objectAtIndex:i]";
    }
    else if (property.actualtype == "object") {
        getter = "[member_list objectAtIndex:i]";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    //var val = "const Value::Member* " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n";
    //val += "\tif (" + property.name + "_member != NULL) {\n";
    //val += "\t\tconst rapidjson::Value& memberList = " + property.name + "_member->value;\n";
    //val += "\t\tfor (SizeType i = 0; i < memberList.Size(); i++) {\n";
    //val += "\t\t\t" + property.name + ".push_back(" + getter + ");\n\t\t}\n\t}";
    
    //Grabbing an array, just grab 'value'
    //var val = "self."+property.name+" = "+"[properties objectForKey:@\""+property.name+"\"];";

    var val = "if ([properties objectForKey:@\""+property.name+"\"]){\n";
    val +=    "NSArray* member_list = [properties objectForKey:@\""+property.name+"\"];\n";
    val +=    "NSMutableArray* mutable_storage = [NSMutableArray new];\n";
    val +=    "for(int i=0;i<[member_list count];i++){\n";
    val +=    "[mutable_storage addObject:"+getter+"];\n";
    val +=    "}";
    val +=    "self."+property.name+" = [mutable_storage copy];";
    val +=    "}";

    return val;
}

var getMapPropertyDeserializer = exports.getMapPropertyDeserializer = function (property, datatype) {
    var getter = null;
    
    var propType = property.actualtype;
    
    if (propType == 'String') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'Boolean') {
        getter = "[[member_list objectForKey:key] boolValue]";
    }
    else if (propType == 'int16') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'uint16') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'int32') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'uint32') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'int64') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'uint64') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'float') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'double') {
        getter = "[member_list objectForKey:key]";
    }
    else if (propType == 'DateTime') {
        getter = "[[PlayFabBaseModel timestampFormatter] dateFromString:[member_list objectForKey:key]]";
    }
    else if (property.isclass) {
        getter = "[["+property.actualtype+" new] initWithDictionary:[member_list objectForKey:key]]";
    }
    else if (property.isenum) {
        getter = "("+property.actualtype+")"+"[member_list objectForKey:key]";
    }
    else if (property.actualtype == "object") {
        getter = "[member_list objectForKey:key]";
    }
    else {
        throw "Unknown property type: " + property.actualtype + " for " + property.name + " in " + datatype.name;
    }
    
    //var val = "const Value::Member* " + property.name + "_member = obj.FindMember(\"" + property.name + "\");\n";
    //val += "\tif (" + property.name + "_member != NULL) {\n";
    //val += "\t\tfor (Value::ConstMemberIterator iter = " + property.name + "_member->value.MemberBegin(); iter != " + property.name + "_member->value.MemberEnd(); ++iter) {\n"
    //val += "\t\t\t" + property.name + "[iter->name.GetString()] = " + getter + ";\n\t\t}\n\t}"
    
    //Grabbing a dictionary, just grab 'value'
    //var val = "self."+property.name+" = "+"[properties objectForKey:@\""+property.name+"\"];";


    var val = "if ([properties objectForKey:@\""+property.name+"\"]){\n";
    val +=    "NSDictionary* member_list = [properties objectForKey:@\""+property.name+"\"];\n";
    val +=    "NSMutableDictionary* mutable_storage = [NSMutableDictionary new];\n";
    val +=    "for(NSString* key in member_list){\n";
    val +=    "[mutable_storage setValue:"+getter+" forKey:key];\n";
    val +=    "}";
    val +=    "self."+property.name+" = [mutable_storage copy];";
    val +=    "}";

    return val;
}

var addTypeAndDependencies = exports.addTypeAndDependencies = function (datatype, datatypes, orderedTypes, addedSet) {
    if (addedSet[datatype.name])
        return;
    
    for (var p in datatype.properties) {
        var property = datatype.properties[p];
        if (property.isclass || property.isenum) {
            var dependentType = datatypes[property.actualtype];
            addTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet)
        }
    }
    
    orderedTypes.push(datatype);
    addedSet[datatype.name] = datatype;
}

var generateModels = exports.generateModels = function (apis, apiOutputDir, libraryName, subdir) {
    var sourceDir = __dirname;
    
    for (var a in apis) {
        var api = apis[a];
        
        // Order datatypes based on dependency graph
        var orderedTypes = [];
        var addedSet = {};
        
        for (var i in api.datatypes) {
            var datatype = api.datatypes[i];
            addTypeAndDependencies(datatype, api.datatypes, orderedTypes, addedSet);
        }
        
            console.log(" PlayFabDataModels.h ");
        var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs")));

            console.log(" PlayFabDataModels.m ");
        var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.m.ejs")));
        
        var modelLocals = {};
        modelLocals.api = api;
        modelLocals.datatypes = orderedTypes;
        modelLocals.getPropertyDef = getPropertyDef;

        modelLocals.getPropertyAttribs = getPropertyAttribs;
        //modelLocals.getPropertySerializer = getPropertySerializer;
        modelLocals.getPropertyDeserializer = getPropertyDeserializer;
        modelLocals.getPropertyDefaultValue = getPropertyDefaultValue;
        modelLocals.getPropertyCopyValue = getPropertyCopyValue;
        modelLocals.isResultHandler = getIsResultHandler;
        modelLocals.getPropertySafeName = getPropertySafeName;
        modelLocals.libraryName = libraryName;
        var generatedHeader = modelHeaderTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "output/PlayFab" + api.name + "DataModels.h"), generatedHeader);
        
        var generatedBody = modelBodyTemplate(modelLocals);
        writeFile(path.resolve(apiOutputDir, "output/" + subdir + "PlayFab" + api.name + "DataModels.m"), generatedBody);
    }
}


function getIsResultHandler(datatype) {
    if (datatype.name.toLowerCase().indexOf("result") > -1 || datatype.name.toLowerCase().indexOf("response") > -1) {
        return true;
    }
    return false;
}

/*
function generateErrors(api, sourceDir, apiOutputDir) {
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cp.ejs")));
    
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "Public/PlayFabErrors.cs"), generatedErrors);
}*/


var generateVersion = exports.generateVersion = function generateVersion(api, apiOutputDir) {
    var sourceDir = __dirname;
    var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.m.ejs")));
    
    var versionLocals = {};
    versionLocals.apiRevision = api.revision;
    versionLocals.sdkRevision = exports.sdkVersion;
    var generatedVersion = versionTemplate(versionLocals);
    writeFile(path.resolve(apiOutputDir, "output/PlayFabVersion.m"), generatedVersion);

}

var generateErrors = exports.generateErrors = function (api, apiOutputDir) {
    var sourceDir = __dirname;
    
    var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabError.h.ejs")));
    
    var errorLocals = {};
    errorLocals.errorList = api.errorList;
    errorLocals.errors = api.errors;
    var generatedErrors = errorsTemplate(errorLocals);
    writeFile(path.resolve(apiOutputDir, "output/PlayFabError.h"), generatedErrors);
}


var getRequestActions = exports.getRequestActions = function (apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest")){
        var val = "if ([PlayFabSettings.TitleId length] > 0)\n\t\trequest.TitleId = PlayFabSettings.TitleId;\n";

        if(apiCall.request == "LoginWithIOSDeviceIDRequest"){
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

var getResultActions = exports.getResultActions = function (apiCall, api) {
    if (api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult")){
        var val = "if ([class_data valueForKey:@\"SessionTicket\"])\n\t\t\tself.mUserSessionTicket = [class_data valueForKey:@\"SessionTicket\"];\n"
        val+= "#ifdef USE_IDFA\n"
        val+= "if(model.SettingsForUser.NeedsAttribution)\n";
        val+= "   [[PlayFab"+api.name+"API GetInstance] MultiStepClientLogin:model.SettingsForUser.NeedsAttribution];\n";
        val+= "#endif\n"
        return val;
    }
    else if (api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult"){
        return "if ([class_data valueForKey:@\"Url\"])\n\t\t\tself.logicServerURL = [class_data valueForKey:@\"Url\"];";
    }
    return "";
}

