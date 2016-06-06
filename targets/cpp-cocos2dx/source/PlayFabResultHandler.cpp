#include "json/document.h"
#include "PlayFabResultHandler.h"
#include "PlayFabError.h"
#include "PlayFabSettings.h"

using namespace PlayFab;
using namespace rapidjson;

bool PlayFabRequestHandler::DecodeRequest(int httpStatus, HttpRequest* request, void* userData, PlayFabBaseModel& outResult, PlayFabError& outError)
{
    std::string response = request->GetReponse();
    Document rawResult;
    rawResult.Parse<0>(response.c_str());

    // Check for bad responses
    if (response.length() == 0 // Null response
        || rawResult.GetParseError() != kParseErrorNone) // Non-Json response
    {
        // If we get here, we failed to connect meaningfully to the server - Assume a timeout
        outError.HttpCode = 408;
        outError.ErrorCode = PlayFabErrorConnectionTimeout;
        // For text returns, use the non-json response if possible, else default to no response
        outError.ErrorName = outError.ErrorMessage = outError.HttpStatus = response.length() == 0 ? "Request Timeout or null response" : response;
        return false;
    }

    // Check if the returned json indicates an error
    auto end = rawResult.MemberEnd();
    auto errorCodeJson = rawResult.FindMember("errorCode");
    if (errorCodeJson != end)
    {
        // There was an error, BUMMER
        if (!errorCodeJson->value.IsNumber())
        {
            // unexpected json formatting - If we get here, we failed to connect meaningfully to the server - Assume a timeout
            outError.HttpCode = 408;
            outError.ErrorCode = PlayFabErrorConnectionTimeout;
            // For text returns, use the non-json response if possible, else default to no response
            outError.ErrorName = outError.ErrorMessage = outError.HttpStatus = response;
            return false;
        }
        // TODO: what happens when the error is not in the enum?
        outError.ErrorCode = static_cast<PlayFabErrorCode>(errorCodeJson->value.GetInt());

        auto codeJson = rawResult.FindMember("code");
        if (codeJson != end && codeJson->value.IsNumber())
            outError.HttpCode = codeJson->value.GetInt();

        auto statusJson = rawResult.FindMember("status");
        if (statusJson != end && statusJson->value.IsString())
            outError.HttpStatus = statusJson->value.GetString();

        auto errorNameJson = rawResult.FindMember("error");
        if (errorNameJson != end && errorNameJson->value.IsString())
            outError.ErrorName = errorNameJson->value.GetString();

        auto errorMessageJson = rawResult.FindMember("errorMessage");
        if (errorMessageJson != end && errorMessageJson->value.IsString())
            outError.ErrorMessage = errorMessageJson->value.GetString();

        auto errorDetailsJson = rawResult.FindMember("errorDetails");
        if (errorDetailsJson != end && errorDetailsJson->value.IsObject())
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

    auto data = rawResult.FindMember("data");
    if (data == end || !data->value.IsObject())
        return false;

    return outResult.readFromValue(data->value);
}
