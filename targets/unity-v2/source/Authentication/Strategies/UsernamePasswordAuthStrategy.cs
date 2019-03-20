using System;
using PlayFab.ClientModels;
using UnityEngine;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class UsernamePasswordAuthStrategy : SilentAuthStrategy
    {
        public new AuthTypes AuthType
        {
            get { return AuthTypes.EmailPassword; }
        }

        public override void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback, AuthKeys authKeys)
        {
            if (string.IsNullOrEmpty(authService.Email) || string.IsNullOrEmpty(authService.Password))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            base.Authenticate(authService, silentResultCallback =>
            {
                if (silentResultCallback == null)
                {
                    if (errorCallback != null)
                        errorCallback.Invoke(new PlayFabError
                        {
                            Error = PlayFabErrorCode.UnknownError,
                            ErrorMessage = "Silent Authentication by Device failed"
                        });

                    return;
                }

                PlayFabClientAPI.AddUsernamePassword(new AddUsernamePasswordRequest
                {
                    //Because it is required & Unique and not supplied by User.
                    Username = !string.IsNullOrEmpty(authService.Username)
                        ? authService.Username
                        : silentResultCallback.PlayFabId,
                    Email = authService.Email,
                    Password = authService.Password
                }, addResult => resultCallback.Invoke(silentResultCallback), errorCallback);
            }, errorCallback, authKeys);
        }

        public override void Link(PlayFabAuthService authService, AuthKeys authKeys)
        {
            throw new NotSupportedException();
        }

        public override void Unlink(PlayFabAuthService authService, AuthKeys authKeys)
        {
            throw new NotSupportedException();
        }
    }
}