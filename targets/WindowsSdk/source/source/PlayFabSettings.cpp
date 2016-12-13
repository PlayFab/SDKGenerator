#include "playfab/PlayFabSettings.h"

namespace PlayFab
{
    const utility::string_t PlayFabSettings::sdkVersion = U("0.41.161107");
    const utility::string_t PlayFabSettings::buildIdentifier = U("jbuild_windowssdk_1");
    const utility::string_t PlayFabSettings::versionString = U("WindowsSDK-0.41.161107");

    bool PlayFabSettings::useDevelopmentEnvironment = false;
    utility::string_t PlayFabSettings::serverURL;
    utility::string_t PlayFabSettings::developmentEnvironmentURL = U(".playfabsandbox.com");
    utility::string_t PlayFabSettings::productionEnvironmentURL = U(".playfabapi.com");
    utility::string_t PlayFabSettings::titleId; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
    ErrorCallback PlayFabSettings::globalErrorHandler = nullptr;

    // Control whether all callbacks are threaded or whether the user manually controlls callback timing from their main-thread
    bool PlayFabSettings::threadedCallbacks = false;

#if defined(ENABLE_PLAYFABSERVER_API) || defined(ENABLE_PLAYFABADMIN_API)
    utility::string_t PlayFabSettings::developerSecretKey; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
#endif

#ifndef DISABLE_PLAYFABCLIENT_API
    utility::string_t PlayFabSettings::advertisingIdType = U(""); // Set this to the appropriate AD_TYPE_X constant below
    utility::string_t PlayFabSettings::advertisingIdValue = U(""); // Set this to corresponding device value

    bool PlayFabSettings::disableAdvertising = false;
    const utility::string_t PlayFabSettings::AD_TYPE_IDFA = U("Idfa");
    const utility::string_t PlayFabSettings::AD_TYPE_ANDROID_ID = U("Adid");
#endif

    utility::string_t PlayFabSettings::GetUrl(const utility::string_t& urlPath)
    {
        if (serverURL.length() == 0)
            serverURL = U("https://" + titleId + (useDevelopmentEnvironment ? developmentEnvironmentURL : productionEnvironmentURL));
        return serverURL + urlPath;
    }
}
