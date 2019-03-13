using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class XBoxLiveAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithXbox(new LoginWithXboxRequest
            {
                TitleId = PlayFabSettings.TitleId,
                XboxToken = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkXboxAccount(new LinkXboxAccountRequest
            {
                XboxToken = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.XBoxLive);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.XBoxLive, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkXboxAccount(new UnlinkXboxAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
                XboxToken = authService.AuthTicket
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.XBoxLive);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.XBoxLive, errorCallback);
            });
        }
    }
}