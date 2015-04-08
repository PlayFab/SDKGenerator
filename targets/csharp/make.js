
var path = require('path');

var sdkVersion = "1.0.2";

exports.makeClientAPI = function(api, sourceDir, apiOutputDir)
{
	console.log("Generating C-sharp client SDK to "+apiOutputDir);
	
	var libname = "Client";
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	
	makeDatatypes([api], sourceDir, apiOutputDir);
	
	makeAPI(api, sourceDir, apiOutputDir);
	
	generateErrors(api, sourceDir, apiOutputDir);
	generateVersion(api, sourceDir, apiOutputDir);
	
	generateProject([api], sourceDir, apiOutputDir, libname);
}

exports.makeServerAPI = function(apis, sourceDir, apiOutputDir)
{
	console.log("Generating C-sharp server SDK to "+apiOutputDir);
	
	var libname = "Server";
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	
	makeDatatypes(apis, sourceDir, apiOutputDir);
	
	for(var i in apis)
	{
		var api = apis[i];
		makeAPI(api, sourceDir, apiOutputDir);
	}
	
	generateErrors(apis[0], sourceDir, apiOutputDir);
	generateVersion(apis[0], sourceDir, apiOutputDir);
	
	generateProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeCombinedAPI = function(apis, sourceDir, apiOutputDir)
{
	console.log("Generating C-sharp combined SDK to "+apiOutputDir);
	
	var libname = "All";
	
	copyTree(path.resolve(sourceDir, 'source'), apiOutputDir);
	
	makeDatatypes(apis, sourceDir, apiOutputDir);
	
	for(var i in apis)
	{
		var api = apis[i];
		makeAPI(api, sourceDir, apiOutputDir);
	}
	
	generateErrors(apis[0], sourceDir, apiOutputDir);
	generateVersion(apis[0], sourceDir, apiOutputDir);
	
	generateProject(apis, sourceDir, apiOutputDir, libname);
}

exports.makeTests = function(testData, apiLookup, sourceDir, testOutputLocation)
{
	var templateDir = path.resolve(sourceDir, "templates");
	
	var testsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Tests.cs.ejs")));
	
	
	var testsLocals = {};
	testsLocals.testData = testData;
	testsLocals.apiLookup = apiLookup;
	testsLocals.getJsonString = getJsonString;
	testsLocals.escapeForString = escapeForString;
	testsLocals.makeTestInstruction = makeTestInstruction;
	var generatedTests = testsTemplate(testsLocals);
	writeFile(testOutputLocation, generatedTests);
}

function makeTestInstruction(action)
{
	if(typeof action == 'string')
	{
		action = action.trim().toLowerCase();
		if(action == "clearcache")
			return "ClearServerCache();";
		else if(action == "wait")
			return "Wait();";
		else if(action == "reset")
			return "ResetServer();";
		else if(action == "abort")
			return "return;";
		throw "Unknown test action "+action;
	}
	
	return action.name+"();";
}

function getJsonString(input)
{
	if(!input)
		return "{}";
	var json = JSON.stringify(input);
	return escapeForString(json);
}

function escapeForString(input)
{
	input = input.replace(new RegExp( '\\\\', "g" ), '\\\\');
	input = input.replace(new RegExp( '\"', "g" ), '\\"');
	return input;
}


function makeDatatypes(apis, sourceDir, apiOutputDir)
{
	var templateDir = path.resolve(sourceDir, "templates");
	
	var modelTemplate = ejs.compile(readFile(path.resolve(templateDir, "Model.cs.ejs")));
	var modelsTemplate = ejs.compile(readFile(path.resolve(templateDir, "Models.cs.ejs")));
	var enumTemplate = ejs.compile(readFile(path.resolve(templateDir, "Enum.cs.ejs")));
	
	var makeDatatype = function(datatype, api)
	{
		var modelLocals = {};
		modelLocals.datatype = datatype;
		modelLocals.getPropertyDef = getModelPropertyDef;
		modelLocals.getPropertyAttribs = getPropertyAttribs;
		modelLocals.api = api;
		
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
		writeFile(path.resolve(apiOutputDir, "source/PlayFab"+api.name+"Models.cs"), generatedModels);
	}
}


function makeAPI(api, sourceDir, apiOutputDir)
{
	console.log("Generating C# "+api.name+" library to "+apiOutputDir);
	

	var templateDir = path.resolve(sourceDir, "templates");
	
	var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "API.cs.ejs")));
	

	var apiLocals = {};
	apiLocals.api = api;
	apiLocals.getAuthParams = getAuthParams;
	apiLocals.getRequestActions = getRequestActions;
	apiLocals.getResultActions = getResultActions;
	apiLocals.getUrlAccessor = getUrlAccessor;
	apiLocals.authKey = api.name == "Client";
	var generatedApi = apiTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "source/PlayFab"+api.name+"API.cs"), generatedApi);
}

function generateErrors(api, sourceDir, apiOutputDir)
{
	var errorsTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/Errors.cs.ejs")));
	
	var errorLocals = {};
	errorLocals.errorList = api.errorList;
	errorLocals.errors = api.errors;
	var generatedErrors = errorsTemplate(errorLocals);
	writeFile(path.resolve(apiOutputDir, "source/PlayFabErrors.cs"), generatedErrors);
}

function generateVersion(api, sourceDir, apiOutputDir)
{
	var versionTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabVersion.cs.ejs")));
	
	var versionLocals = {};
	versionLocals.apiRevision = api.revision;
	versionLocals.sdkRevision = sdkVersion;
	var generatedVersion = versionTemplate(versionLocals);
	writeFile(path.resolve(apiOutputDir, "source/PlayFabVersion.cs"), generatedVersion);
}

function generateProject(apis, sourceDir, apiOutputDir, libname)
{
	var vcProjTemplate = ejs.compile(readFile(path.resolve(sourceDir, "templates/PlayFabSDK.csproj.ejs")));
	
	var projLocals = {};
	projLocals.apis = apis;
	projLocals.libname = libname;
	
	var generatedProject = vcProjTemplate(projLocals);
	writeFile(path.resolve(apiOutputDir, "PlayFabSDK.csproj"), generatedProject);
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

function getPropertyAttribs(property, datatype, api)
{
	var attribs = "";
	
	if(property.isenum)
	{
		if(property.collection)
			attribs += "[JsonProperty(ItemConverterType = typeof(StringEnumConverter))]\n\t\t";
		else
			attribs += "[JsonConverter(typeof(StringEnumConverter))]\n\t\t";
		
	}
	
	if(property.isUnordered)
	{
		var listDatatype = api.datatypes[property.actualtype];
		if(listDatatype && listDatatype.sortKey)
			attribs += "[Unordered(SortProperty=\""+listDatatype.sortKey+"\")]\n\t\t";
		else
			attribs += "[Unordered]\n\t\t";
	}
	
	return attribs;
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
	else if(api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
		return "PlayFabSettings.LogicServerURL = result.Url;\n";
	return "";
}

function getUrlAccessor(apiCall)
{
	if(apiCall.serverType == 'logic')
		return "PlayFabSettings.GetLogicURL()";

	return "PlayFabSettings.GetURL()";
}


