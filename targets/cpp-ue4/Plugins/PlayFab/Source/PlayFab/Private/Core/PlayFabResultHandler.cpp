#include "PlayFabPrivatePCH.h"
#include "PlayFabResultHandler.h"
#include "PlayFabSettings.h"

using namespace PlayFab;

bool PlayFabRequestHandler::DecodeRequest(FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, PlayFab::FPlayFabBaseModel& OutResult, PlayFab::FPlayFabError& OutError)
{
	FString ResponseStr, ErrorStr;
	if (bSucceeded && HttpResponse.IsValid())
	{
		if (EHttpResponseCodes::IsOk(HttpResponse->GetResponseCode()))
		{
			// Create the Json parser
			ResponseStr = HttpResponse->GetContentAsString();
			TSharedPtr<FJsonObject> JsonObject;
			TSharedRef<TJsonReader<> > JsonReader = TJsonReaderFactory<>::Create(ResponseStr);

			if (FJsonSerializer::Deserialize(JsonReader, JsonObject) && JsonObject.IsValid())
			{
				if (PlayFabRequestHandler::DecodeError(JsonObject, OutError))
				{
					return false;
				}

				const TSharedPtr<FJsonObject>* DataJsonObject;
				if (JsonObject->TryGetObjectField(TEXT("data"), DataJsonObject))
				{
					return OutResult.readFromValue(*DataJsonObject);
				}
			}
		}
		else
		{
			// Create the Json parser
			ResponseStr = HttpResponse->GetContentAsString();
			TSharedPtr<FJsonObject> JsonObject;
			TSharedRef<TJsonReader<> > JsonReader = TJsonReaderFactory<>::Create(ResponseStr);

			if (FJsonSerializer::Deserialize(JsonReader, JsonObject) && JsonObject.IsValid())
			{
				if (PlayFabRequestHandler::DecodeError(JsonObject, OutError))
				{
					return false;
				}
			}
		}
	}

	// If we get here, we failed to connect meaningfully to the server - Assume a timeout
	OutError.HttpCode = 408;
	OutError.ErrorCode = PlayFabErrorConnectionTimeout;
	// For text returns, use the non-json response if possible, else default to no response
	OutError.ErrorName = OutError.ErrorMessage = OutError.HttpStatus = TEXT("Request Timeout or null response");

	return false;
}


bool PlayFabRequestHandler::DecodeError(TSharedPtr<FJsonObject> JsonObject, PlayFab::FPlayFabError& OutError)
{
	// check if returned json indicates an error
	if (JsonObject->HasField(TEXT("errorCode")))
	{
		// deserialize the FPlayFabError object 
		JsonObject->TryGetNumberField(TEXT("errorCode"), OutError.ErrorCode);
		JsonObject->TryGetNumberField(TEXT("code"), OutError.HttpCode);
		JsonObject->TryGetStringField(TEXT("status"), OutError.HttpStatus);
		JsonObject->TryGetStringField(TEXT("error"), OutError.ErrorName);
		JsonObject->TryGetStringField(TEXT("errorMessage"), OutError.ErrorMessage);

		// TODO: handle error details properly
		//"errorDetails"

		// TODO: handle global error delegate here

		// We encountered no errors parsing the error
		return true;
	}

	return false;
}

