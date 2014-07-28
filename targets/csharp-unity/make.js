
var path = require('path');

var sdkVersion = "1.0.1";

exports.makeClientAPI = function(api, sourceDir, apiOutputDir)
{
	console.log("Generating C-sharp Unity client SDK to "+apiOutputDir);
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	copyTree(path.resolve(sourceDir, 'client-source'), apiOutputDir);
	
	makeDatatypes([api], sourceDir, apiOutputDir);
	
	makeAPI(api, sourceDir, apiOutputDir);
	
	generateErrors(api, sourceDir, apiOutputDir);
	
	generateVersion(api, sourceDir, apiOutputDir);
}

exports.makeServerAPI = function(apis, sourceDir, apiOutputDir)
{
	console.log("Generating C-sharp Unity server SDK to "+apiOutputDir);
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	copyTree(path.resolve(sourceDir, 'server-source'), apiOutputDir);
	
	makeDatatypes(apis, sourceDir, apiOutputDir);
	
	for(var i in apis)
	{
		var api = apis[i];
		makeAPI(api, sourceDir, apiOutputDir);
	}
	
	generateErrors(apis[0], sourceDir, apiOutputDir);
	
	generateVersion(apis[0], sourceDir, apiOutputDir);
}

function makeDatatypes(apis, sourceDir, apiOutputDir)
{
	var templateDir = path.resolve(sourceDir, "templates");
	
	var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cp.ejs")));
	var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cp.ejs")));
	var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cp.ejs")));
	
	
	var makeDatatype = function(datatype)
	{
		var modelLocals = {};
		modelLocals.datatype = datatype;
		modelLocals.getPropertyDef = getModelPropertyDef;
		modelLocals.getPropertyAttribs = getPropertyAttribs;
		modelLocals.getPropertyJsonReader = getPropertyJsonReader;
		
		var generatedModel = null;
		
		if(datatype.isenum)
		{
			generatedModel = enumTemplate(modelLocals);
		}
		else
		{
			generatedModel = modelTemplate(modelLocals);
		}
		
		return generatedModel;
	};
	
	for(var a in apis)
	{
		var api = apis[a];
		
		var modelsLocal = {};
		modelsLocal.api = api;
		modelsLocal.makeDatatype = makeDatatype;
		var generatedModels = modelsTemplate(modelsLocal);
		writeFile(path.resolve(apiOutputDir, "PlayFabSDK/Public/PlayFab"+api.name+"Models.cs"), generatedModels);
	}
}

function makeAPI(api, sourceDir, apiOutputDir)
{
	console.log("Generating C# "+api.name+" library to "+apiOutputDir);
	
	var templateDir = path.resolve(sourceDir, "templates");
	
	var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cp.ejs")));
	

	var apiLocals = {};
	apiLocals.api = api;
	apiLocals.getAuthParams = getAuthParams;
	apiLocals.getRequestActions = getRequestActions;
	apiLocals.getResultActions = getResultActions;
	apiLocals.authKey = api.name == "Client";
	var generatedApi = apiTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "PlayFabSDK/Public/PlayFab"+api.name+"API.cs"), generatedApi);
}

function generateErrors(api, sourceDir, apiOutputDir)
{
	var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cp.ejs")));
	
	var errorLocals = {};
	errorLocals.errorList = api.errorList;
	errorLocals.errors = api.errors;
	var generatedErrors = errorsTemplate(errorLocals);
	writeFile(path.resolve(apiOutputDir, "PlayFabSDK/Public/PlayFabErrors.cs"), generatedErrors);
}

function generateVersion(api, sourceDir, apiOutputDir)
{
	var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cp.ejs")));
	
	var versionLocals = {};
	versionLocals.apiRevision = api.revision;
	versionLocals.sdkRevision = sdkVersion;
	var generatedVersion = versionTemplate(versionLocals);
	writeFile(path.resolve(apiOutputDir, "PlayFabSDK/Internal/PlayFabVersion.cs"), generatedVersion);
}


function getModelPropertyDef(property, datatype)
{
	if(property.collection)
	{
		var basicType = getPropertyCSType(property, datatype, false);
		
		if(property.collection == 'array')
		{
			return 'List<'+basicType+'> '+property.name;
		}
		else if(property.collection == 'map')
		{
			return 'Dictionary<string,'+basicType+'> '+property.name;
		}
		else
		{
			throw "Unknown collection type: "+property.collection+" for " +property.name+" in "+datatype.name;
		}
	}
	else
	{
		var basicType = getPropertyCSType(property, datatype, true);
		return basicType+' '+property.name;
	}
}

function getPropertyAttribs(property, datatype)
{
	return "";
}


function getPropertyCSType(property, datatype, needOptional)
{
	var optional = (needOptional && property.optional) ? '?' : '';
	
	if(property.actualtype == 'String')
	{
		return 'string';
	}
	else if(property.actualtype == 'Boolean')
	{
		return 'bool'+optional;
	}
	else if(property.actualtype == 'int16')
	{
		return 'short'+optional;
	}
	else if(property.actualtype == 'uint16')
	{
		return 'ushort'+optional;
	}
	else if(property.actualtype == 'int32')
	{
		return 'int'+optional;
	}
	else if(property.actualtype == 'uint32')
	{
		return 'uint'+optional;
	}
	else if(property.actualtype == 'int64')
	{
		return 'long'+optional;
	}
	else if(property.actualtype == 'uint64')
	{
		return 'ulong'+optional;
	}
	else if(property.actualtype == 'float')
	{
		return 'float'+optional;
	}
	else if(property.actualtype == 'double')
	{
		return 'double'+optional;
	}
	else if(property.actualtype == 'decimal')
	{
		return 'decimal'+optional;
	}
	else if(property.actualtype == 'DateTime')
	{
		return 'DateTime'+optional;
	}
	else if(property.isclass)
	{
		return property.actualtype;
	}
	else if(property.isenum)
	{
		return property.actualtype+optional;
	}
	else if(property.actualtype == "object")
	{
		return 'object';
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}

function getPropertyJSType(property, datatype)
{

	if(property.actualtype == 'String')
	{
		return 'string';
	}
	else if(property.actualtype == 'Boolean')
	{
		return 'bool?';
	}
	else if(property.actualtype == 'int16')
	{
		return 'double?';
	}
	else if(property.actualtype == 'uint16')
	{
		return 'double?';
	}
	else if(property.actualtype == 'int32')
	{
		return 'double?';
	}
	else if(property.actualtype == 'uint32')
	{
		return 'double?';
	}
	else if(property.actualtype == 'int64')
	{
		return 'double?';
	}
	else if(property.actualtype == 'uint64')
	{
		return 'double?';
	}
	else if(property.actualtype == 'float')
	{
		return 'double?';
	}
	else if(property.actualtype == 'double')
	{
		return 'double?';
	}
	else if(property.actualtype == 'decimal')
	{
		return 'double?';
	}
	else if(property.actualtype == 'DateTime')
	{
		return 'string';
	}
	else if(property.isclass)
	{
		return 'object';
	}
	else if(property.isenum)
	{
		return 'string';
	}
	else if(property.actualtype == "object")
	{
		return 'object';
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}


function getMapDeserializer(property, datatype)
{
	if(property.actualtype == 'String')
	{
		return "JsonUtil.GetDictionary<string>(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'Boolean')
	{
		return "JsonUtil.GetDictionary<bool>(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int16')
	{
		return "JsonUtil.GetDictionaryInt16(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint16')
	{
		return "JsonUtil.GetDictionaryUInt16(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int32')
	{
		return "JsonUtil.GetDictionaryInt32(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint32')
	{
		return "JsonUtil.GetDictionaryUInt32(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int64')
	{
		return "JsonUtil.GetDictionaryInt64(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint64')
	{
		return "JsonUtil.GetDictionaryUint64(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'float')
	{
		return "JsonUtil.GetDictionaryFloat(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'double')
	{
		return "JsonUtil.GetDictionaryDouble(json, \""+property.name+"\");";
	}
	else if(property.actualtype == "object")
	{
		return "JsonUtil.GetDictionary<object>(json, \""+property.name+"\");";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}



function getListDeserializer(property, api)
{
	if(property.actualtype == 'String')
	{
		return "JsonUtil.GetList<string>(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'Boolean')
	{
		return "JsonUtil.GetList<bool>(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int16')
	{
		return "JsonUtil.GetListInt16(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint16')
	{
		return "JsonUtil.GetListUInt16(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int32')
	{
		return "JsonUtil.GetListInt32(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint32')
	{
		return "JsonUtil.GetListUInt32(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'int64')
	{
		return "JsonUtil.GetListInt64(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'uint64')
	{
		return "JsonUtil.GetListUint64(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'float')
	{
		return "JsonUtil.GetListFloat(json, \""+property.name+"\");";
	}
	else if(property.actualtype == 'double')
	{
		return "JsonUtil.GetListDouble(json, \""+property.name+"\");";
	}
	else if(property.actualtype == "object")
	{
		return "JsonUtil.GetList<object>(json, \""+property.name+"\");";
	}
	else
	{
		throw "Unknown property type: "+property.actualtype+" for " +property.name+" in "+datatype.name;
	}
}


function getPropertyJsonReader(property, datatype)
{
	var csType = getPropertyCSType(property, datatype, false);
	var csOptionalType = getPropertyCSType(property, datatype, true);
	var jsType = getPropertyJSType(property, datatype);
	
	
	if(property.isclass)
	{
		if(property.collection == "map")
		{
			return property.name + " = JsonUtil.GetObjectDictionary<"+csType+">(json, \""+property.name+"\");";
		}
		else if(property.collection == "array")
		{
			return property.name + " = JsonUtil.GetObjectList<"+csType+">(json, \""+property.name+"\");";
		}
		else
		{
			return property.name + " = JsonUtil.GetObject<"+csType+">(json, \""+property.name+"\");";
		}
	}
	else if(property.collection == "map")
	{
		return property.name + " = "+getMapDeserializer(property, datatype);
	}
	else if(property.collection == "array")
	{
		return property.name + " = "+getListDeserializer(property, datatype);
	}
	else if(property.isenum)
	{
		return property.name + " = ("+csOptionalType+")JsonUtil.GetEnum<"+csType+">(json, \""+property.name+"\");";
	}
	else if(property.actualtype == "DateTime")
	{
		return property.name + " = ("+csOptionalType+")JsonUtil.GetDateTime(json, \""+property.name+"\");";
	}
	else if(property.actualtype == "object")
	{
		return property.name + " = JsonUtil.GetObject<object>(json, \""+property.name+"\");";
	}
	else
	{
		return property.name + " = ("+csOptionalType+")JsonUtil.Get<"+jsType+">(json, \""+property.name+"\");";
	}
	
}

function getAuthParams(apiCall)
{
	if(apiCall.auth == 'SecretKey')
		return "\"X-SecretKey\", PlayFabSettings.DeveloperSecretKey";
	else if(apiCall.auth == 'SessionTicket')
		return "\"X-Authorization\", AuthKey";
	
	return "null, null";
}


function getRequestActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
		return "request.TitleId = PlayFabSettings.TitleId ?? request.TitleId;\n\t\t\tif(request.TitleId == null) throw new Exception (\"Must be have PlayFabSettings.TitleId set to call this method\");\n";
	if(api.name == "Client" && apiCall.auth == 'SessionTicket')
		return "if (AuthKey == null) throw new Exception (\"Must be logged in to call this method\");\n"
	if(apiCall.auth == 'SecretKey')
		return "if (PlayFabSettings.DeveloperSecretKey == null) throw new Exception (\"Must have PlayFabSettings.DeveloperSecretKey set to call this method\");\n"
	return "";
}

function getResultActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
		return "AuthKey = result.SessionTicket ?? AuthKey;\n";
	return "";
}



