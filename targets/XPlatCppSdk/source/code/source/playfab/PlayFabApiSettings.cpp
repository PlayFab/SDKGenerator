#include <stdafx.h>

#include <playfab/PlayFabApiSettings.h>
#include <playfab/PlayFabSettings.h>

namespace PlayFab
{
    PlayFabApiSettings::PlayFabApiSettings() :
#ifndef DISABLE_PLAYFABCLIENT_API
        advertisingIdType(PlayFabSettings::advertisingIdType),
        advertisingIdValue(PlayFabSettings::advertisingIdValue),
        disableAdvertising(PlayFabSettings::disableAdvertising),
#endif
        verticalName(PlayFabSettings::verticalName),
        baseServiceHost(PlayFabSettings::productionEnvironmentURL),
        titleId(PlayFabSettings::titleId)
    {
    }

    std::string PlayFabApiSettings::GetUrl(const std::string& urlPath, const std::map<std::string, std::string>& getParams)
    {
        std::string fullUrl;
        fullUrl.reserve(1000);

        fullUrl += "https://";

        if (verticalName.length() > 0)
        {
            fullUrl += verticalName;
        }
        else
        {
            fullUrl += titleId;
        }

        fullUrl += baseServiceHost;
        fullUrl += urlPath;

        bool firstParam = true;
        for (auto const& paramPair : getParams)
        {
            if (firstParam) {
                fullUrl += "?";
                firstParam = false;
            }
            else {
                fullUrl += "&";
            }
            fullUrl += paramPair.first;
            fullUrl += "=";
            fullUrl += paramPair.second;
        }

        return fullUrl;
    }
}