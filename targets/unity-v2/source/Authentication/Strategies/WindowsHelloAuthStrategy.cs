using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class WindowsHelloAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            PlayFabClientAPI.LoginWithWindowsHello(new LoginWithWindowsHelloRequest
            {
                TitleId = PlayFabSettings.TitleId,
                ChallengeSignature = authService.WindowsHelloChallengeSignature,
                PublicKeyHint = authService.WindowsHelloPublicKeyHint,
                InfoRequestParameters = authService.InfoRequestParams
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkWindowsHello(new LinkWindowsHelloAccountRequest
            {
                PublicKey = authService.AuthTicket,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink,
                UserName = authService.Username
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.WindowsHello);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.WindowsHello, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkWindowsHello(new UnlinkWindowsHelloAccountRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
                PublicKeyHint = authService.AuthTicket 
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.WindowsHello);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.WindowsHello, errorCallback);
            });
        }
    }
}