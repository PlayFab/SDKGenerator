#pragma once

#include <string>

namespace PlayFab
{
    /// <summary>
    /// Container for PlayFab authentication credentials data.
    /// </summary>
    class PlayFabAuthenticationContext
    {
    public:
#ifndef DISABLE_PLAYFABCLIENT_API
        std::string clientSessionTicket; // Client session ticket that is used as an authentication token in many PlayFab API methods.
#endif
#ifndef DISABLE_PLAYFABENTITY_API
        std::string entityToken; // User's entity token. Entity tokens are required by all Entity API methods.
#endif
#if defined(ENABLE_PLAYFABSERVER_API) || defined(ENABLE_PLAYFABADMIN_API)
        std::string developerSecretKey; // Developer secret key. These keys can be used in development environments.
#endif

        PlayFabAuthenticationContext();
        void ForgetAllCredentials();
    };
}