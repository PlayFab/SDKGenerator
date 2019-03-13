using System;
using PlayFab.ClientModels;
using UnityEngine;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class EmailPasswordAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (authService.RememberMe && !string.IsNullOrEmpty(authService.RememberMeId))
            {
                PlayFabClientAPI.LoginWithCustomID(new LoginWithCustomIDRequest
                {
                    TitleId = PlayFabSettings.TitleId,
                    CustomId = authService.RememberMeId,
                    CreateAccount = true,
                    InfoRequestParameters = authService.InfoRequestParams
                }, resultCallback, errorCallback);

                return;
            }

            // a good catch: If username & password is empty, then do not continue, and Call back to Authentication UI Display
            if (!authService.RememberMe && string.IsNullOrEmpty(authService.Email) && string.IsNullOrEmpty(authService.Password))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }
            
            // We have not opted for remember me in a previous session, so now we have to login the user with email & password.
            PlayFabClientAPI.LoginWithEmailAddress(new LoginWithEmailAddressRequest
            {
                TitleId = PlayFabSettings.TitleId,
                Email = authService.Email,
                Password = authService.Password,
                InfoRequestParameters = authService.InfoRequestParams
            }, loginResult =>
            {
                // Note: At this point, they already have an account with PlayFab using a Username (email) & Password
                // If RememberMe is checked, then generate a new Guid for Login with CustomId.
                if (authService.RememberMe)
                {
                    authService.RememberMeId = Guid.NewGuid().ToString();
                    authService.AuthType = AuthTypes.EmailAndPassword;

                    //Fire and forget, but link a custom ID to this PlayFab Account.
                    PlayFabClientAPI.LinkCustomID(new LinkCustomIDRequest
                    {
                        CustomId = authService.RememberMeId,
                        ForceLink = authService.ForceLink,
                        AuthenticationContext = loginResult.AuthenticationContext
                    }, null, null);
                }
                resultCallback.Invoke(loginResult);
            }, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            throw new NotSupportedException();
        }

        public void Unlink(PlayFabAuthService authService)
        {
            throw new NotSupportedException();
        }
    }
}