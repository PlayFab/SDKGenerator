using System;
using PlayFab.ClientModels;
using UnityEngine;

namespace PlayFab.Authentication.Strategies
{
    internal sealed class NintendoSwitchAuthStrategy : IAuthenticationStrategy
    {
        public void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
            PlayFabClientAPI.LoginWithNintendoSwitchDeviceId(new LoginWithNintendoSwitchDeviceIdRequest
            {
                TitleId = PlayFabSettings.TitleId,
                NintendoSwitchDeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                InfoRequestParameters = authService.InfoRequestParams,
                CreateAccount = true
            }, resultCallback, errorCallback);
        }

        public void Link(PlayFabAuthService authService)
        {
            PlayFabClientAPI.LinkNintendoSwitchDeviceId(new LinkNintendoSwitchDeviceIdRequest
            {
                NintendoSwitchDeviceId = SystemInfo.deviceUniqueIdentifier,
                AuthenticationContext = authService.AuthenticationContext,
                ForceLink = authService.ForceLink
            }, resultCallback =>
            {
                authService.InvokeLink(AuthTypes.NintendoSwitch);
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.NintendoSwitch, errorCallback);
            });
        }

        public void Unlink(PlayFabAuthService authService)
        {
            PlayFabClientAPI.UnlinkNintendoSwitchDeviceId(new UnlinkNintendoSwitchDeviceIdRequest
            {
                AuthenticationContext = authService.AuthenticationContext,
                NintendoSwitchDeviceId = PlayFabSettings.DeviceUniqueIdentifier 
            }, resultCallback =>
            {
                authService.InvokeUnlink(AuthTypes.NintendoSwitch);
            }, errorCallback =>
            {
                authService.InvokeUnlink(AuthTypes.NintendoSwitch, errorCallback);
            });
        }
    }
}