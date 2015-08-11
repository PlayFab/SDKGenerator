
var path = require('path');

var sdkVersion = "1.0.0";

exports.putInRoot = true;

exports.makeCombinedAPI = function(apis, sourceDir, apiOutputDir)
{
	console.log("Generating JavaScript Client SDK to "+apiOutputDir);
	
	var templateDir = path.resolve(sourceDir, "templates");
	
	var apiTemplate = ejs.compile(readFile(path.resolve(templateDir, "playfab.js.ejs")));
	
	var apiLocals = {};
	apiLocals.apis = apis;
	apiLocals.getRequestActions = getRequestActions;
	apiLocals.getResultActions = getResultActions;
	var generatedApi = apiTemplate(apiLocals);
	writeFile(path.resolve(apiOutputDir, "PlayFabClientSDK.js"), generatedApi);
}

function getRequestActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.request == "RegisterPlayFabUserRequest"))
		return "request.TitleId = PlayFabClientSDK.settings.title_id != null ? PlayFabClientSDK.settings.title_id : request.TitleId; if(request.TitleId == null) throw \"Must be have settings.title_id set to call this method\";\n";
	if(api.name == "Client" && apiCall.auth == 'SessionTicket')
		return "if (internalSettings.session_ticket == null) throw \"Must be logged in to call this method\";\n"
	if(apiCall.auth == 'SecretKey')
		return "if (PlayFabClientSDK.settings.developer_secret_key == null) throw \"Must have PlayFabSettings.DeveloperSecretKey set to call this method\";\n"
	return "";
}

function getResultActions(apiCall, api)
{
	if(api.name == "Client" && (apiCall.result == "LoginResult" || apiCall.result == "RegisterPlayFabUserResult"))
		return "if(result.data && result.data.SessionTicket){ internalSettings.session_ticket = result.data.SessionTicket; }\n";
	else if(api.name == "Client" && apiCall.result == "GetCloudScriptUrlResult")
		return "PlayFabClientSDK.settings.logic_server_url = result.Url;\n";
	return "";
}