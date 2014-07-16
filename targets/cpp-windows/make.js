
var path = require('path');

exports.makeClientAPI = function(api, sourceDir, apiOutputDir)
{
	var libname = "Client";
	
	console.log("Generating Windows C++ client SDK to "+apiOutputDir);
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	copyTree(path.resolve(sourceDir, 'client-source'), apiOutputDir);
	
	makeAPI(api, sourceDir, apiOutputDir);
	
	generateModels(api.datatypes, sourceDir, apiOutputDir, libname);
	
	generateErrors(api, sourceDir, apiOutputDir);
	
	makeAPIProject([api], sourceDir, apiOutputDir, libname);
}

exports.makeServerAPI = function(apis, sourceDir, apiOutputDir)
{
	var libname = "Server";

	console.log("Generating Windows C++ server SDK to "+apiOutputDir);
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	copyTree(path.resolve(sourceDir, 'server-source'), apiOutputDir);
	
	var allDatatypes = {};
	for(var i in apis)
	{
		var api = apis[i];
		
		for(var d in api.datatypes)
		{
			allDatatypes[d] = api.datatypes[d];
		}
		
		makeAPI(api, sourceDir, apiOutputDir);
	}
	generateModels(allDatatypes, sourceDir, apiOutputDir, libname);
	
	generateErrors(apis[0], sourceDir, apiOutputDir);
	
	makeAPIProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeCombinedAPI = function(apis, sourceDir, apiOutputDir)
{
	var libname = "All";
	
	console.log("Generating Windows C++ combined SDK to "+apiOutputDir);
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	copyTree(path.resolve(sourceDir, 'server-source'), apiOutputDir);
	
	var allDatatypes = {};
	for(var i in apis)
	{
		var api = apis[i];
		
		for(var d in api.datatypes)
		{
			allDatatypes[d] = api.datatypes[d];
		}
		
		makeAPI(api, sourceDir, apiOutputDir);
	}
	generateModels(allDatatypes, sourceDir, apiOutputDir, libname);
	
	generateErrors(apis[0], sourceDir, apiOutputDir);
	
	makeAPIProject(apis, sourceDir, apiOutputDir, libname);
}


function makeAPIProject(apis, sourceDir, apiOutputDir, libname)
{
	var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.vcxproj.ejs")));
	var vcProjFilterTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.vcxproj.filters.ejs")));
	
	var projLocals = {};
	projLocals.apis = apis;
	projLocals.libname = libname;
	
	var generatedProject = vcProjTemplate(projLocals);
	writeFile(path.resolve(apiOutputDir, "build/VC12/PlayFabAPI/PlayFabAPI.vcxproj"), generatedProject);
	
	var generatedFilters = vcProjFilterTemplate(projLocals);
	writeFile(path.resolve(apiOutputDir, "build/VC12/PlayFabAPI/PlayFabAPI.vcxproj.filters"), generatedFilters);
}

function makeAPI(api, sourceDir, apiOutputDir)
{
	var apiHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.h.ejs")));
	var apiBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabAPI.cpp.ejs")));
	
	var apiLocals = {};
	apiLocals.api = api;
	apiLocals.getAuthParams = getAuthParams;
	apiLocals.getRequestActions = getRequestActions;
	apiLocals.getResultActions = getResultActions;
	apiLocals.authKey = api.name == "Client";
	apiLocals.hasRequest = hasRequest;
	
	var generatedHeader = apiHeaderTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "include/playfab/PlayFab"+api.name+"API.h"), generatedHeader);
	
	var generatedBody = apiBodyTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "source/core/PlayFab"+api.name+"API.cpp"), generatedBody);
}

function hasRequest(apiCall, api)
{
	var requestType = api.datatypes[apiCall.request];
	return requestType.properties.length > 0;
}

function getPropertyDef(property, datatype)
{
	if(property.collection == "array")
		return "std::list<"+getPropertyCPPType(property, datatype, false)+"> "+property.name+";";
	else if(property.collection == "map")
		return "std::map<std::string, "+getPropertyCPPType(property, datatype, false)+"> "+property.name+";";
	else
		return getPropertyCPPType(property, datatype, true)+" "+property.name+";";
}

function getPropertyCPPType(property, datatype, needOptional)
{
	var isOptional = property.optional && needOptional;
	
	if(property.actualtype == 'String')
	{
		return 'std::string';
	}
	else if(property.actualtype == 'Boolean')
	{
		return isOptional ? 'OptionalBool' : 'bool';
	}
	else if(property.actualtype == 'int16')
	{
		return isOptional ? 'OptionalInt16' : 'Int16';
	}
	else if(property.actualtype == 'uint16')
	{
		return isOptional ? 'OptionalUint16' : 'Uint16';
	}
	else if(property.actualtype == 'int32')
	{
		return isOptional ? 'OptionalInt32' : 'Int32';
	}
	else if(property.actualtype == 'uint32')
	{
		return isOptional ? 'OptionalUint32' : 'Uint32';
	}
	else if(property.actualtype == 'int64')
	{
		return isOptional ? 'OptionalInt64' : 'Int64';
	}
	else if(property.actualtype == 'uint64')
	{
		return isOptional ? 'OptionalInt64' : 'Uint64';
	}
	else if(property.actualtype == 'float')
	{
		return isOptional ? 'OptionalFloat' : 'float';
	}
	else if(property.actualtype == 'double')
	{
		return isOptional ? 'OptionalDouble' : 'double';
	}
	else if(property.actualtype == 'decimal')
	{
		return isOptional ? 'OptionalDouble' : 'double';
	}
	else if(property.actualtype == 'DateTime')
	{
		return isOptional ? 'OptionalTime' : 'time_t';
	}
	else if(property.isclass)
	{
		return isOptional ? property.actualtype+'*' : property.actualtype; // sub object
	}
	else if(property.isenum)
	{
		return isOptional ? ('Boxed<'+property.actualtype+'>') : property.actualtype; // enum
	}
	else if(property.actualtype == "object")
	{
		return "MultitypeVar";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}

function getPropertyDefaultValue(property, datatype)
{
	var isOptional = property.optional;
	if(property.collection)
		return '';
		
	if(property.actualtype == 'String')
	{
		return "";
	}
	else if(property.actualtype == 'Boolean')
	{
		return isOptional ? '' : 'false';
	}
	else if(property.actualtype == 'int16')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'uint16')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'int32')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'uint32')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'int64')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'uint64')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'float')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'double')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'decimal')
	{
		return isOptional ? '' : '0';
	}
	else if(property.actualtype == 'DateTime')
	{
		return isOptional ? '' : '0';
	}
	else if(property.isclass)
	{
		return isOptional ? 'NULL' : ''; // sub object
	}
	else if(property.isenum)
	{
		return isOptional ? '' : ''; // enum
	}
	else if(property.actualtype == "object")
	{
		return '';
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}

function getPropertyCopyValue(property, datatype)
{
	if(property.isclass && property.optional && !property.collection)
	{
		return "src."+property.name+" ? new "+property.actualtype+"(*src."+property.name+") : NULL";
	}
	return "src."+property.name;
}

function getPropertySerializer(property, datatype)
{
	if(property.collection == "array")
		return getArrayPropertySerializer(property, datatype);
	else if(property.collection == "map")
		return getMapPropertySerializer(property, datatype);
		
	var writer = null;
	var tester = null;
	
	var propName = property.name;
	var isOptional = property.optional;
	
	if(property.actualtype == 'String')
	{
		writer = "writer.String("+propName+".c_str());";
		tester = propName+".length() > 0";
	}
	else if(property.actualtype == 'Boolean')
	{
		writer = "writer.Bool("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'int16')
	{
		writer = "writer.Int("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'uint16')
	{
		writer = "writer.Uint("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'int32')
	{
		writer = "writer.Int("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'uint32')
	{
		writer = "writer.Uint("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'int64')
	{
		writer = "writer.Int64("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'uint64')
	{
		writer = "writer.Uint64("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'float')
	{
		writer = "writer.Double("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'double')
	{
		writer = "writer.Double("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'decimal')
	{
		writer = "writer.Double("+propName+");";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == 'DateTime')
	{
		writer = "writeDatetime("+propName+", writer);";
		tester = propName+".notNull()";
	}
	else if(property.isclass)
	{
		if(isOptional)
			writer = propName+"->writeJSON(writer);";
		else
			writer = propName+".writeJSON(writer);";
		tester = propName+" != NULL";
	}
	else if(property.isenum)
	{
		writer = "write"+property.actualtype+"EnumJSON("+propName+", writer);";
		tester = propName+".notNull()";
	}
	else if(property.actualtype == "object")
	{
		writer = propName+".writeJSON(writer);";
		tester = propName+".notNull()";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +propName+" in "+datatype.name;
	}
	
	if(isOptional)
	{
		return"if("+tester+") { writer.String(\""+propName+"\"); " + writer + " }";
	}
	else
	{
		return "writer.String(\""+propName+"\"); " + writer;
	}
}

function getArrayPropertySerializer(property, datatype)
{
	var writer = null;

	var propName = property.name;
	var isOptional = property.optional;
	var cppType = getPropertyCPPType(property, datatype, false);
	
	if(property.actualtype == 'String')
	{
		writer = "writer.String(iter->c_str());";
	}
	else if(property.actualtype == 'Boolean')
	{
		writer = "writer.Bool(*iter);";
	}
	else if(property.actualtype == 'int16')
	{
		writer = "writer.Int(*iter);";
	}
	else if(property.actualtype == 'uint16')
	{
		writer = "writer.Uint(*iter);";
	}
	else if(property.actualtype == 'int32')
	{
		writer = "writer.Int(*iter);";
	}
	else if(property.actualtype == 'uint32')
	{
		writer = "writer.Uint(*iter);";
	}
	else if(property.actualtype == 'int64')
	{
		writer = "writer.Int64(*iter);";
	}
	else if(property.actualtype == 'uint64')
	{
		writer = "writer.Uint64(*iter);";
	}
	else if(property.actualtype == 'float')
	{
		writer = "writer.Double(*iter);";
	}
	else if(property.actualtype == 'double')
	{
		writer = "writer.Double(*iter);";
	}
	else if(property.actualtype == 'decimal')
	{
		writer = "writer.Double(*iter);";
	}
	else if(property.actualtype == 'DateTime')
	{
		writer = "writeDatetime(*iter, writer);";
	}
	else if(property.isclass)
	{
		writer = "iter->writeJSON(writer);";
	}
	else if(property.isenum)
	{
		writer = "write"+property.actualtype+"EnumJSON(*iter, writer);";
	}
	else if(property.actualtype == "object")
	{
		writer = "iter->writeJSON(writer);";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +propName+" in "+datatype.name;
	}
	

	var collectionWriter = "writer.StartArray();\n\t";
	collectionWriter += "for (std::list<"+cppType+">::iterator iter = "+propName+".begin(); iter != "+propName+".end(); iter++) {\n\t\t";
	collectionWriter += writer+"\n\t}\n\t";	
	collectionWriter += "writer.EndArray();\n\t";
	
	if(isOptional)
	{
		return "if(!"+propName+".empty()) {\n\twriter.String(\""+propName+"\");\n\t" + collectionWriter + " }";
	}
	else
	{
		return "writer.String(\""+propName+"\");\n\t" + collectionWriter;
	}
}


function getMapPropertySerializer(property, datatype)
{
	var writer = null;

	var propName = property.name;
	var isOptional = property.optional;
	var cppType = getPropertyCPPType(property, datatype, false);
	
	if(property.actualtype == 'String')
	{
		writer = "writer.String(iter->second.c_str());";
	}
	else if(property.actualtype == 'Boolean')
	{
		writer = "writer.Bool(iter->second);";
	}
	else if(property.actualtype == 'int16')
	{
		writer = "writer.Int(iter->second);";
	}
	else if(property.actualtype == 'uint16')
	{
		writer = "writer.Uint(iter->second);";
	}
	else if(property.actualtype == 'int32')
	{
		writer = "writer.Int(iter->second);";
	}
	else if(property.actualtype == 'uint32')
	{
		writer = "writer.Uint(iter->second);";
	}
	else if(property.actualtype == 'int64')
	{
		writer = "writer.Int64(iter->second);";
	}
	else if(property.actualtype == 'uint64')
	{
		writer = "writer.Uint64(iter->second);";
	}
	else if(property.actualtype == 'float')
	{
		writer = "writer.Double(iter->second);";
	}
	else if(property.actualtype == 'double')
	{
		writer = "writer.Double(iter->second);";
	}
	else if(property.actualtype == 'decimal')
	{
		writer = "writer.Double(iter->second);";
	}
	else if(property.actualtype == 'DateTime')
	{
		writer = "writeDatetime(iter->second, writer);";
	}
	else if(property.isclass)
	{
		writer = "iter->second.writeJSON(writer);";
	}
	else if(property.isenum)
	{
		writer = "write"+property.actualtype+"EnumJSON(iter->second, writer);";
	}
	else if(property.actualtype == "object")
	{
		writer = "iter->second.writeJSON(writer);";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +propName+" in "+datatype.name;
	}
	
	var collectionWriter = "writer.StartObject();\n\t";
	collectionWriter += "for (std::map<std::string, "+cppType+">::iterator iter = "+propName+".begin(); iter != "+propName+".end(); ++iter) {\n\t\t";
	collectionWriter += "writer.String(iter->first.c_str()); "+writer+"\n\t}\n\t";
	collectionWriter += "writer.EndObject();\n\t";
	
	if(isOptional)
	{
		return "if(!"+propName+".empty()) {\n\twriter.String(\""+propName+"\");\n\t" + collectionWriter + "}";
	}
	else
	{
		return "writer.String(\""+propName+"\");\n\t" + collectionWriter;
	}
}

function getPropertyDeserializer(property, datatype)
{
	if(property.collection == "array")
		return getArrayPropertyDeserializer(property, datatype);
	else if(property.collection == "map")
		return getMapPropertyDeserializer(property, datatype);
		
	var getter = null;
	
	if(property.actualtype == 'String')
	{
		getter = property.name+"_member->value.GetString()";
	}
	else if(property.actualtype == 'Boolean')
	{
		getter = property.name+"_member->value.GetBool()";
	}
	else if(property.actualtype == 'int16')
	{
		getter = property.name+"_member->value.GetInt()";
	}
	else if(property.actualtype == 'uint16')
	{
		getter = property.name+"_member->value.GetUint()";
	}
	else if(property.actualtype == 'int32')
	{
		getter = property.name+"_member->value.GetInt()";
	}
	else if(property.actualtype == 'uint32')
	{
		getter = property.name+"_member->value.GetUint()";
	}
	else if(property.actualtype == 'int64')
	{
		getter = property.name+"_member->value.GetInt64()";
	}
	else if(property.actualtype == 'uint64')
	{
		getter = property.name+"_member->value.GetUint64()";
	}
	else if(property.actualtype == 'float')
	{
		getter = property.name+"_member->value.GetDouble()";
	}
	else if(property.actualtype == 'double')
	{
		getter = property.name+"_member->value.GetDouble()";
	}
	else if(property.actualtype == 'decimal')
	{
		getter = property.name+"_member->value.GetDouble()";
	}
	else if(property.actualtype == 'DateTime')
	{
		getter = "readDatetime("+property.name+"_member->value)";
	}
	else if(property.isclass)
	{
		if(property.optional)
			getter = "new "+property.actualtype+"("+property.name+"_member->value)";
		else
			getter = property.actualtype+"("+property.name+"_member->value)";
	}
	else if(property.isenum)
	{
		getter = "read"+property.actualtype+"FromValue("+property.name+"_member->value)";
	}
	else if(property.actualtype == "object")
	{
		getter = "MultitypeVar("+property.name+"_member->value)";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
	
	var val = "const Value::Member* "+property.name+"_member = obj.FindMember(\""+property.name+"\");\n";
	val += "\tif ("+property.name+"_member != NULL) "+property.name+" = "+getter+";"
	
	return val;
}

function getArrayPropertyDeserializer(property, datatype)
{
	var getter = null;
	
	if(property.actualtype == 'String')
	{
		getter = "memberList[i].GetString()";
	}
	else if(property.actualtype == 'Boolean')
	{
		getter = "memberList[i].GetBool()";
	}
	else if(property.actualtype == 'int16')
	{
		getter = "memberList[i].GetInt()";
	}
	else if(property.actualtype == 'uint16')
	{
		getter = "memberList[i].GetUint()";
	}
	else if(property.actualtype == 'int32')
	{
		getter = "memberList[i].GetInt()";
	}
	else if(property.actualtype == 'uint32')
	{
		getter = "memberList[i].GetUint()";
	}
	else if(property.actualtype == 'int64')
	{
		getter = "memberList[i].GetInt64()";
	}
	else if(property.actualtype == 'uint64')
	{
		getter = "memberList[i].GetUint64()";
	}
	else if(property.actualtype == 'float')
	{
		getter = "memberList[i].GetDouble()";
	}
	else if(property.actualtype == 'double')
	{
		getter = "memberList[i].GetDouble()";
	}
	else if(property.actualtype == 'decimal')
	{
		getter = "memberList[i].GetDouble()";
	}
	else if(property.actualtype == 'DateTime')
	{
		getter = "readDatetime(memberList[i])";
	}
	else if(property.isclass)
	{
		getter = property.actualtype+"(memberList[i])";
	}
	else if(property.isenum)
	{
		getter = "read"+property.actualtype+"FromValue(memberList[i])";
	}
	else if(property.actualtype == "object")
	{
		getter = "MultitypeVar(memberList[i])";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
	
	var val = "const Value::Member* "+property.name+"_member = obj.FindMember(\""+property.name+"\");\n";
	val += "\tif ("+property.name+"_member != NULL) {\n";
	val += "\t\tconst rapidjson::Value& memberList = "+property.name+"_member->value;\n";
	val += "\t\tfor (SizeType i = 0; i < memberList.Size(); i++) {\n";
	val += "\t\t\t"+property.name+".push_back("+getter+");\n\t\t}\n\t}";
	
	return val;
}

function getMapPropertyDeserializer(property, datatype)
{
	var getter = null;
	
	if(property.actualtype == 'String')
	{
		getter = "iter->value.GetString()";
	}
	else if(property.actualtype == 'Boolean')
	{
		getter = "iter->value.GetBool()";
	}
	else if(property.actualtype == 'int16')
	{
		getter = "iter->value.GetInt()";
	}
	else if(property.actualtype == 'uint16')
	{
		getter = "iter->value.GetUint()";
	}
	else if(property.actualtype == 'int32')
	{
		getter = "iter->value.GetInt()";
	}
	else if(property.actualtype == 'uint32')
	{
		getter = "iter->value.GetUint()";
	}
	else if(property.actualtype == 'int64')
	{
		getter = "iter->value.GetInt64()";
	}
	else if(property.actualtype == 'uint64')
	{
		getter = "iter->value.GetUint64()";
	}
	else if(property.actualtype == 'float')
	{
		getter = "iter->value.GetDouble()";
	}
	else if(property.actualtype == 'double')
	{
		getter = "iter->value.GetDouble()";
	}
	else if(property.actualtype == 'decimal')
	{
		getter = "iter->value.GetDouble()";
	}
	else if(property.actualtype == 'DateTime')
	{
		getter = "readDatetime(iter->value)";
	}
	else if(property.isclass)
	{
		getter = property.actualtype+"(iter->value)";
	}
	else if(property.isenum)
	{
		getter = "read"+property.actualtype+"FromValue(iter->value)";
	}
	else if(property.actualtype == "object")
	{
		getter = "MultitypeVar(iter->value)";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
	
	var val = "const Value::Member* "+property.name+"_member = obj.FindMember(\""+property.name+"\");\n";
	val += "\tif ("+property.name+"_member != NULL) {\n";
	val += "\t\tfor (Value::ConstMemberIterator iter = "+property.name+"_member->value.MemberBegin(); iter != "+property.name+"_member->value.MemberEnd(); ++iter) {\n"
    val += "\t\t\t"+property.name+"[iter->name.GetString()] = "+getter+";\n\t\t}\n\t}"
    
	return val;
}

function addTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet)
{
	if(addedSet[datatype.name])
		return;
	
	for(var p in datatype.properties)
	{
		var property = datatype.properties[p];
		if(property.isclass || property.isenum)
		{
			var dependentType = datatypes[property.actualtype];
			addTypeAndDependencies(dependentType, datatypes, orderedTypes, addedSet)
		}
	}
	
	orderedTypes.push(datatype);
	addedSet[datatype.name] = datatype;
}

function generateModels(datatypes, sourceDir, apiOutputDir, libraryName)
{
	// Order datatypes based on dependency graph
	var orderedTypes = [];
	var addedSet = {};
	
	for(var i in datatypes)
	{
		var datatype = datatypes[i];
		addTypeAndDependencies(datatype, datatypes, orderedTypes, addedSet);
	}
	
	var modelHeaderTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.h.ejs")));
	var modelBodyTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabDataModels.cpp.ejs")));
	
	var modelLocals = {};
	modelLocals.datatypes = orderedTypes;
	modelLocals.getPropertyDef = getPropertyDef;
	modelLocals.getPropertySerializer = getPropertySerializer;
	modelLocals.getPropertyDeserializer = getPropertyDeserializer;
	modelLocals.getPropertyDefaultValue = getPropertyDefaultValue;
	modelLocals.getPropertyCopyValue = getPropertyCopyValue;
	modelLocals.libraryName = libraryName;
	var generatedHeader = modelHeaderTemplate(modelLocals);
	writeFile(path.resolve(apiOutputDir, "include/playfab/PlayFabDataModels.h"), generatedHeader);
	
	var generatedBody = modelBodyTemplate(modelLocals);
	writeFile(path.resolve(apiOutputDir, "source/core/PlayFabDataModels.cpp"), generatedBody);
}


function generateErrors(api, sourceDir, apiOutputDir)
{
	var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabError.h.ejs")));
	
	var errorLocals = {};
	errorLocals.errorList = api.errorList;
	errorLocals.errors = api.errors;
	var generatedErrors = errorsTemplate(errorLocals);
	writeFile(path.resolve(apiOutputDir, "include/playfab/PlayFabError.h"), generatedErrors);
}


function getAuthParams(apiCall)
{
	if(apiCall.auth == 'SecretKey')
		return "httpRequest->SetHeader(\"X-SecretKey\", PlayFabSettings::developerSecretKey);"
	else if(apiCall.auth == 'SessionTicket')
		return "httpRequest->SetHeader(\"X-Authorization\", mUserSessionTicket);"
	
	return "";
}


function getRequestActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
		return "if (PlayFabSettings::titleId.length() > 0)\n\t\trequest.TitleId = PlayFabSettings::titleId;";
	return "";
}

function getResultActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
		return "if (outResult.SessionTicket.length() > 0)\n\t\t\t(static_cast<PlayFab"+api.name+"API*>(userData))->mUserSessionTicket = outResult.SessionTicket;";
	return "";
}