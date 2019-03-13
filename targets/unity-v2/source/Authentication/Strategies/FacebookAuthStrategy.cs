using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class FacebookAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithFacebook(new LoginWithFacebookRequest
            {
                TitleId = PlayFabSettings.TitleId,
                AccessToken = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkFacebookAccount(new LinkFacebookAccountRequest
            {
                AccessToken = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.Facebook);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.Facebook, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkFacebookAccount(new UnlinkFacebookAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.Facebook);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.Facebook, errorCallback);
            });
        }
    }
}