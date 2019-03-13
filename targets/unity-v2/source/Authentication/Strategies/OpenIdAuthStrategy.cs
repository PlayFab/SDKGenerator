using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class OpenIdAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.AuthTicket))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            PlayFabClientAPI.LoginWithOpenIdConnect(new LoginWithOpenIdConnectRequest
            {
                TitleId = PlayFabSettings.TitleId,
                ConnectionId = authService.OpenIdConnectionId,
                IdToken = authService.AuthTicket,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkOpenIdConnect(new LinkOpenIdConnectRequest
            {
                IdToken = authService.AuthTicket,
                ConnectionId = authService.OpenIdConnectionId, 
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.OpenId);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.OpenId, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkOpenIdConnect(new UninkOpenIdConnectRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
                ConnectionId = authService.OpenIdConnectionId 
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.OpenId);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.OpenId, errorCallback);
            });
        }
    }
}