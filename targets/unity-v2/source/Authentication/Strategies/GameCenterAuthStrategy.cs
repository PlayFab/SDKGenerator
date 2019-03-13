using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class GameCenterAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithGameCenter(new LoginWithGameCenterRequest
            {
                TitleId = PlayFabSettings.TitleId,
                Signature = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkGameCenterAccount(new LinkGameCenterAccountRequest
            {
                GameCenterId = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.GameCenter);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.GameCenter, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkGameCenterAccount(new UnlinkGameCenterAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.GameCenter);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.GameCenter, errorCallback);
            });
        }
    }
}