#include "PlayFabPrivatePCH.h"
#include "PlayFabSettings.h"

namespace PlayFab
{
    bool PlayFabSettings::useDevelopmentEnvironment = false;
	FString PlayFabSettings::serverURL;
	FString PlayFabSettings::developmentEnvironmentURL = ".playfabsandbox.com";
	FString PlayFabSettings::productionEnvironmentURL = ".playfabapi.com";
	FString PlayFabSettings::logicServerURL = "";
	FString PlayFabSettings::titleId;
	FString PlayFabSettings::developerSecretKey;
    FString PlayFabSettings::advertisingIdType;
    FString PlayFabSettings::advertisingIdValue;

    bool PlayFabSettings::disableAdvertising = false;
    const FString PlayFabSettings::AD_TYPE_IDFA = "Idfa";
    const FString PlayFabSettings::AD_TYPE_ANDROID_ID = "Android_Id";
}
