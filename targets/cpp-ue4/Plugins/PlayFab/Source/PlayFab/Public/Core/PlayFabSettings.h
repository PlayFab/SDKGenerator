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
        static FString logicServerURL; // Assigned by GetCloudScriptUrl, used by RunCloudScript
        static FString titleId; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        static FString developerSecretKey; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        static FString advertisingIdType; // Set this to the appropriate AD_TYPE_X constant below
        static FString advertisingIdValue; // Set this to corresponding device value

        // DisableAdvertising is provided for completeness, but changing it is not suggested
        // Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
        static bool disableAdvertising;
        static const FString AD_TYPE_IDFA;
        static const FString AD_TYPE_ANDROID_ID;

        static FString getURL(const FString& callPath)
        {
            if (serverURL.Len() == 0)
                serverURL = TEXT("https://") + titleId + (useDevelopmentEnvironment ? developmentEnvironmentURL : productionEnvironmentURL);
            return serverURL + callPath;
        }

        static FString getLogicURL(const FString& callPath)
        {
            return logicServerURL + callPath;
        }
    };
}
