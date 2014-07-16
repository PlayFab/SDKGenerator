
#include "playfab/PlayFabSettings.h"

#include <string>


namespace PlayFab
{

    bool PlayFabSettings::useDevelopmentEnvironment = false;
    std::string PlayFabSettings::developmentEnvironmentURL = "https://api.playfabdev.com";
    std::string PlayFabSettings::productionEnvironmentURL = "https://api.playfab.com";
    std::string PlayFabSettings::titleId;
    ErrorCallback PlayFabSettings::globalErrorHandler = NULL;
}
