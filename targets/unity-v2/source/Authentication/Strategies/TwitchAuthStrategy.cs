using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class TwitchAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithTwitch(new LoginWithTwitchRequest
            {
                TitleId = PlayFabSettings.TitleId,
                AccessToken = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkTwitch(new LinkTwitchAccountRequest
            {
                AccessToken = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.Twitch);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.Twitch, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkTwitch(new UnlinkTwitchAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.Twitch);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.Twitch, errorCallback);
            });
        }
    }
}