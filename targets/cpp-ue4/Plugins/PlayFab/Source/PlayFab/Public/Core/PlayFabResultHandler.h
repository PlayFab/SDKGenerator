#pragma once

#include "PlayFabBaseModel.h"
#include "PlayFabError.h"

namespace PlayFab
{


	class PlayFabRequestHandler
	{
	public:

		static bool DecodeRequest(FHttpRequestPtr HttpRequest, FHttpResponsePtr HttpResponse, bool bSucceeded, PlayFab::FPlayFabBaseModel& OutResult, PlayFab::FPlayFabError& OutError);
		static bool DecodeError(TSharedPtr<FJsonObject> JsonObject, PlayFab::FPlayFabError& OutError);
	};


};

