using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class GooglePlayGamesAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithGoogleAccount(new LoginWithGoogleAccountRequest
            {
                TitleId = PlayFabSettings.TitleId,
                ServerAuthCode = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkGoogleAccount(new LinkGoogleAccountRequest
            {
                ServerAuthCode = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.GooglePlayGames);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.GooglePlayGames, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkGoogleAccount(new UnlinkGoogleAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.GooglePlayGames);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.GooglePlayGames, errorCallback);
            });
        }
    }
}