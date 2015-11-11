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
    //ErrorCallback PlayFabSettings::globalErrorHandler = NULL;
	FString PlayFabSettings::developerSecretKey;
}
