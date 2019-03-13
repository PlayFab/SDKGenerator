using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class FacebookInstantGameAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithFacebookInstantGamesId(new LoginWithFacebookInstantGamesIdRequest
            {
                TitleId = PlayFabSettings.TitleId,
                FacebookInstantGamesSignature = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkFacebookInstantGamesId(new LinkFacebookInstantGamesIdRequest 
            {
                FacebookInstantGamesSignature = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.FacebookInstantGames);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.FacebookInstantGames, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkFacebookInstantGamesId(new UnlinkFacebookInstantGamesIdRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
                FacebookInstantGamesId = authService.AuthTicket
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.FacebookInstantGames);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.FacebookInstantGames, errorCallback);
            });
        }
    }
}