#pragma once

#include "PlayFabError.h"

namespace PlayFab
{

    class PlayFabSettings
    {
    public:

        static bool useDevelopmentEnvironment;
        static FString serverURL;
		static FString developmentEnvironmentURL;
		static FString productionEnvironmentURL;
		static FString logicServerURL;
		static FString titleId;
        //static ErrorCallback globalErrorHandler;
		static FString developerSecretKey;

		static FString getURL(const FString& callPath)
        {
            if (serverURL.Len() == 0)
                serverURL = TEXT("https://")+titleId+(useDevelopmentEnvironment ? developmentEnvironmentURL : productionEnvironmentURL);
            return serverURL + callPath;
        }
		
		static FString getLogicURL(const FString& callPath)
		{
			return logicServerURL + callPath;
		}
		
    };


}
