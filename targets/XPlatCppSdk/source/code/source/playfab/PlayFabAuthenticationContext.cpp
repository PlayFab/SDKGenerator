#include <stdafx.h>

#include <playfab/PlayFabAuthenticationContext.h>
#include <playfab/PlayFabSettings.h>

namespace PlayFab
{
    PlayFabAuthenticationContext::PlayFabAuthenticationContext()
    {
#ifndef DISABLE_PLAYFABCLIENT_API
        clientSessionTicket = PlayFabSettings::clientSessionTicket;
#endif
#ifndef DISABLE_PLAYFABENTITY_API
        entityToken = PlayFabSettings::entityToken;
#endif
#if defined(ENABLE_PLAYFABSERVER_API) || defined(ENABLE_PLAYFABADMIN_API)
        developerSecretKey = PlayFabSettings::developerSecretKey;
#endif
    }

    void PlayFabAuthenticationContext::ForgetAllCredentials()
    {
#ifndef DISABLE_PLAYFABCLIENT_API
        clientSessionTicket.clear();
#endif
#ifndef DISABLE_PLAYFABENTITY_API
        entityToken.clear();
#endif
#if defined(ENABLE_PLAYFABSERVER_API) || defined(ENABLE_PLAYFABADMIN_API)
        developerSecretKey.clear();
#endif
    }
}