
#include "rapidjson/document.h"
#include "playfab/PlayFabResultHandler.h"
#include "playfab/PlayFabError.h"
#include "playfab/PlayFabSettings.h"

using namespace PlayFab;
using namespace rapidjson;



bool PlayFabRequestHandler::DecodeRequest(int httpStatus, HttpRequest* request, void* userData, PlayFabBaseModel& outResult, PlayFabError& outError)
{
    if (request->GetReponse().length() == 0)
    {
        // Got a null body
		memset(&outError, 0, sizeof(outError));
        return false;
    }

    Document rawResult;
    rawResult.Parse<0>(request->GetReponse().c_str());
    const Document& resultEnvelope = rawResult;

    const Value::Member* errorCodeJson = resultEnvelope.FindMember("errorCode");
    if (errorCodeJson != NULL)
    {
        // THere was an error, BUMMER
        if (!errorCodeJson->value.IsNumber())
        {
            // unexpected json formatting
            return false;
        }
        // TODO: what happens when the error is not in the enum?
        outError.ErrorCode = static_cast<PlayFabErrorCode>(errorCodeJson->value.GetInt());

        const Value::Member* codeJson = resultEnvelope.FindMember("code");
        if (codeJson != NULL && codeJson->value.IsNumber())
            outError.HttpCode = codeJson->value.GetInt();

        const Value::Member* statusJson = resultEnvelope.FindMember("status");
        if (statusJson != NULL && statusJson->value.IsString())
            outError.HttpStatus = statusJson->value.GetString();

		const Value::Member* errorNameJson = resultEnvelope.FindMember("error");
        if (errorNameJson != NULL && errorNameJson->value.IsString())
            outError.ErrorName = errorNameJson->value.GetString();
			
        const Value::Member* errorMessageJson = resultEnvelope.FindMember("errorMessage");
        if (errorMessageJson != NULL && errorMessageJson->value.IsString())
            outError.ErrorMessage = errorMessageJson->value.GetString();

        const Value::Member* errorDetailsJson = resultEnvelope.FindMember("errorDetails");
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

    const Value::Member* data = resultEnvelope.FindMember("data");
    if (data == NULL || !data->value.IsObject())
        return false;

    bool success = outResult.readFromValue(data->value);
    if (!success)
    {
        // json decoding error
        return false;
    }

    return true;
}