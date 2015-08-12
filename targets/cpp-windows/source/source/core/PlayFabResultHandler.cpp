
#include "rapidjson/document.h"
#include "playfab/PlayFabResultHandler.h"
#include "playfab/PlayFabError.h"
#include "playfab/PlayFabSettings.h"

using namespace PlayFab;
using namespace rapidjson;



bool PlayFabRequestHandler::DecodeRequest(int httpStatus, HttpRequest* request, void* userData, PlayFabBaseModel& outResult, PlayFabError& outError)
{
	std::string response = request->GetReponse();
	Document rawResult;
	rawResult.Parse<0>(response.c_str());

	// Check for bad responses
	if (response.length() == 0 // Null response
		|| rawResult.GetParseError() != NULL) // Non-Json response
	{
		// If we get here, we failed to connect meaningfully to the server - Assume a timeout
		outError.HttpCode = 408;
		outError.ErrorCode = PlayFabErrorConnectionTimeout;
		// For text returns, use the non-json response if possible, else default to no response
		outError.ErrorName = outError.ErrorMessage = outError.HttpStatus = response.length() == 0 ? "Request Timeout or null response" : response;
		return false;
	}

	// Check if the returned json indicates an error
	const Value::Member* errorCodeJson = rawResult.FindMember("errorCode");
	if (errorCodeJson != NULL)
	{
		// There was an error, BUMMER
		if (!errorCodeJson->value.IsNumber())
		{
			// unexpected json formatting - If we get here, we failed to connect meaningfully to the server - Assume a timeout
			outError.HttpCode = 408;
			outError.ErrorCode = PlayFabErrorConnectionTimeout;
			// For text returns, use the non-json response if possible, else default to no response
			outError.ErrorName = outError.ErrorMessage = outError.HttpStatus = response.length() == 0 ? "Request Timeout or null response" : response;
			return false;
		}
		// TODO: what happens when the error is not in the enum?
		outError.ErrorCode = static_cast<PlayFabErrorCode>(errorCodeJson->value.GetInt());

		const Value::Member* codeJson = rawResult.FindMember("code");
		if (codeJson != NULL && codeJson->value.IsNumber())
			outError.HttpCode = codeJson->value.GetInt();

		const Value::Member* statusJson = rawResult.FindMember("status");
		if (statusJson != NULL && statusJson->value.IsString())
			outError.HttpStatus = statusJson->value.GetString();

		const Value::Member* errorNameJson = rawResult.FindMember("error");
		if (errorNameJson != NULL && errorNameJson->value.IsString())
			outError.ErrorName = errorNameJson->value.GetString();

		const Value::Member* errorMessageJson = rawResult.FindMember("errorMessage");
		if (errorMessageJson != NULL && errorMessageJson->value.IsString())
			outError.ErrorMessage = errorMessageJson->value.GetString();

		const Value::Member* errorDetailsJson = rawResult.FindMember("errorDetails");
		if (errorDetailsJson != NULL && errorDetailsJson->value.IsObject())
		{
			const Value& errorDetailsObj = errorDetailsJson->value;

			for (Value::ConstMemberIterator itr = errorDetailsObj.MemberBegin(); itr != errorDetailsObj.MemberEnd(); ++itr)
			{
				if (itr->name.IsString() && itr->value.IsArray())
				{
					const Value& errorList = itr->value;
					for (Value::ConstValueIterator erroListIter = errorList.Begin(); erroListIter != errorList.End(); ++erroListIter)
						outError.ErrorDetails.insert(std::pair<std::string, std::string>(itr->name.GetString(), erroListIter->GetString()));
				}
			}
		}
		// We encountered no errors parsing the error
		return false;
	}

	const Value::Member* data = rawResult.FindMember("data");
	if (data == NULL || !data->value.IsObject())
		return false;

	return outResult.readFromValue(data->value);
}