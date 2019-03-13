using System;
using PlayFab.ClientModels;

namespace PlayFab.Authentication.Strategies
{
    public interface IAuthenticationStrategy
    {
        void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback);
        void Link(PlayFabAuthService authService);
        void Unlink(PlayFabAuthService authService);
    }
}