#ifndef PLAYFAB_PLAYFABSETTINGS_H_
#define PLAYFAB_PLAYFABSETTINGS_H_

#include <string>
#include "PlayFabError.h"
#include "IHttpRequester.h"

namespace PlayFab
{
    class PlayFabSettings
    {
    public:
        static IHttpRequester* httpRequester;

        static const std::string sdkVersion;
        static const std::string buildIdentifier;
        static const std::string versionString;

        static bool useDevelopmentEnvironment;
        static std::string serverURL;
        static std::string developmentEnvironmentURL;
        static std::string productionEnvironmentURL;
        static std::string titleId; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        static ErrorCallback globalErrorHandler;
        static std::string entityToken;
        static std::string developerSecretKey; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        static std::string clientSessionTicket; // This is automatically set by any successful login call, or RegisterPlayFabUser

        static std::string getURL(const std::string& callPath)
        {
            if (serverURL.length() == 0)
                serverURL = "https://" + titleId + (useDevelopmentEnvironment ? developmentEnvironmentURL : productionEnvironmentURL);
            return serverURL + callPath;
        }
    };
}
#endif
