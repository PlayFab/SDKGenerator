using System;
using PlayFab.ClientModels;
using UnityEngine;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class UsernamePasswordAuthStrategy : SilentAuthStrategy
    {
        public override void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            if (string.IsNullOrEmpty(authService.Email) || string.IsNullOrEmpty(authService.Password))
            {
                authService.InvokeDisplayAuthentication();
                return;
            }

            base.Authenticate(authService, silentCallback =>
            {
                if (silentCallback == null)
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
                        : silentCallback.PlayFabId,
                    Email = authService.Email,
                    Password = authService.Password
                }, addResult => resultCallback.Invoke(silentCallback), errorCallback);
            }, errorCallback);
        }

        public override void Link(PlayFabAuthService authService)
        {
            throw new NotSupportedException();
        }

        public override void Unlink(PlayFabAuthService authService)
        {
            throw new NotSupportedException();
        }
    }
}