#include <stdafx.h>

#include <playfab/PlayFabAuthenticationContext.h>
#include <playfab/PlayFabSettings.h>

namespace PlayFab
{
    PlayFabAuthenticationContext::PlayFabAuthenticationContext() :
        clientSessionTicket(PlayFabSettings::clientSessionTicket),
        entityToken(PlayFabSettings::entityToken),
        developerSecretKey(PlayFabSettings::developerSecretKey)
    {
    }

    void PlayFabAuthenticationContext::ForgetAllCredentials()
    {
        clientSessionTicket.clear();
        entityToken.clear();
        developerSecretKey.clear();
    }
}