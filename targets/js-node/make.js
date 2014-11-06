
var path = require('path');

var sdkVersion = "1.0.0";

exports.putInRoot = true;

exports.makeCombinedAPI = function(apis, sourceDir, apiOutputDir)
{
	console.log("Generating Node.js combined SDK to "+apiOutputDir);
	
	var templateDir = path.resolve(sourceDir, "templates");
	
	var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));
	
	var apiLocals = {};
	apiLocals.apis = apis;
	apiLocals.getAuthParams = getAuthParams;
	apiLocals.getRequestActions = getRequestActions;
	apiLocals.getResultActions = getResultActions;
	apiLocals.getUrlAccessor = getUrlAccessor;
	var generatedApi = apiTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "playfab.js"), generatedApi);
}

function getAuthParams(apiCall)
{
	if(apiCall.auth == 'SecretKey')
		return "\"X-SecretKey\", settings.developer_secret_key";
	else if(apiCall.auth == 'SessionTicket')
		return "\"X-Authorization\", settings.session_ticket";
	
	return "null, null";
}

function getRequestActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
		return "request.TitleId = settings.title_id != null ? settings.title_id : request.TitleId; if(request.TitleId == null) throw \"Must be have settings.title_id set to call this method\";\n";
	if(api.name == "Client" && apiCall.auth == 'SessionTicket')
		return "if (settings.session_ticket == null) throw \"Must be logged in to call this method\";\n"
	if(apiCall.auth == 'SecretKey')
		return "if (settings.developer_secret_key == null) throw \"Must have PlayFabSettings.DeveloperSecretKey set to call this method\";\n"
	return "";
}

function getResultActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
		return "settings.session_ticket = result.SessionTicket != null ? settings.session_ticket : settings.session_ticket;\n";
	else if(api.name == "Client" && apiCall.result == "GetLogicServerUrlResult")
		return "settings.logic_server_url = result.Url;\n";
	return "";
}

function getUrlAccessor(apiCall)
{
	if(apiCall.serverType == 'logic')
		return "get_logic_server_url()";

	return "get_server_url()";
}
