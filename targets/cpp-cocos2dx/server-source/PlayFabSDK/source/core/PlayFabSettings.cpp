
#include "playfab/PlayFabSettings.h"

#include <string>


namespace PlayFab
{

    bool PlayFabSettings::useDevelopmentEnvironment = false;
	std::string PlayFabSettings::serverURL;
    std::string PlayFabSettings::developmentEnvironmentURL = ".playfabsandbox.com";
    std::string PlayFabSettings::productionEnvironmentURL = ".playfabapi.com";
    std::string PlayFabSettings::titleId;
    ErrorCallback PlayFabSettings::globalErrorHandler = NULL;
	std::string PlayFabSettings::developerSecretKey;
}
