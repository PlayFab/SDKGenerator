#pragma once

#include <string>

namespace PlayFab
{
    /// <summary>
    /// Container for user session data.
    /// </summary>
    struct PlayFabUserSession
    {
        std::string clientSessionTicket; // Client session ticket that is used as an authentication token in many PlayFab API methods.
        std::string entityToken; // User's entity token. Entity tokens are required by all Entity API methods.

        void ForgetAllCredentials()
        {
            clientSessionTicket.clear();
            entityToken.clear();
        }
    };
}