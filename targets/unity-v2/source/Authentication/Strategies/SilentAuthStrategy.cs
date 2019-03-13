using System;
using PlayFab.ClientModels;
using UnityEngine;

namespace PlayFab.Authentication.Strategies
{
    internal class SilentAuthStrategy : IAuthenticationStrategy
    {
        public virtual void Authenticate(PlayFabAuthService authService, Action<LoginResult> resultCallback, Action<PlayFabError> errorCallback)
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            PlayFabClientAPI.LoginWithAndroidDeviceID(new LoginWithAndroidDeviceIDRequest
            {
                TitleId = PlayFabSettings.TitleId,
                AndroidDevice = SystemInfo.deviceModel,
                OS = SystemInfo.operatingSystem,
                AndroidDeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                CreateAccount = true,
                InfoRequestParameters = authService.InfoRequestParams
            }, result, error);
#elif UNITY_IPHONE || UNITY_IOS && !UNITY_EDITOR
            PlayFabClientAPI.LoginWithIOSDeviceID(new LoginWithIOSDeviceIDRequest
            {
                TitleId = PlayFabSettings.TitleId,
                DeviceModel = SystemInfo.deviceModel,
                OS = SystemInfo.operatingSystem,
                DeviceId = SystemInfo.deviceUniqueIdentifier,
                CreateAccount = true,
                InfoRequestParameters = authService.InfoRequestParams
            }, result, error);
#else
            PlayFabClientAPI.LoginWithCustomID(new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.TitleId,
                CustomId = SystemInfo.deviceUniqueIdentifier,
                CreateAccount = true,
                InfoRequestParameters = authService.InfoRequestParams
            }, resultCallback, errorCallback);
#endif
        }

        public virtual void Link(PlayFabAuthService authService)
        {
            Authenticate(authService, resultCallback =>
            {
#if UNITY_ANDROID && !UNITY_EDITOR
                PlayFabClientAPI.LinkAndroidDeviceID(new LinkAndroidDeviceIDRequest
                {
                    AndroidDeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext,
                    AndroidDevice = SystemInfo.deviceModel,
                    OS = SystemInfo.operatingSystem,
                    ForceLink = authService.ForceLink
                }, linkCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent, errorCallback);
                });
#elif UNITY_IPHONE || UNITY_IOS && !UNITY_EDITOR
                PlayFabClientAPI.LinkIOSDeviceID(new LinkIOSDeviceIDRequest
                {
                    DeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext,
                    DeviceModel = SystemInfo.deviceModel,
                    OS = SystemInfo.operatingSystem,
                    ForceLink = authService.ForceLink
                }, linkCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent, errorCallback);
                });
#else
                PlayFabClientAPI.LinkCustomID(new LinkCustomIDRequest
                {
                    CustomId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext,
                    ForceLink = authService.ForceLink
                }, linkCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeLink(AuthTypes.Silent, errorCallback);
                });
#endif
            }, errorCallback =>
            {
                authService.InvokeLink(AuthTypes.Silent, errorCallback);
            });
        }

        public virtual void Unlink(PlayFabAuthService authService)
        {
            Authenticate(authService, resultCallback =>
            {
#if UNITY_ANDROID && !UNITY_EDITOR
                PlayFabClientAPI.UnlinkAndroidDeviceID(new UnlinkAndroidDeviceIDRequest()
                {
                    AndroidDeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext
                }, unlinkCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent, errorCallback);
                });
#elif UNITY_IPHONE || UNITY_IOS && !UNITY_EDITOR
                PlayFabClientAPI.UnlinkIOSDeviceID(new UnlinkIOSDeviceIDRequest()
                {
                    DeviceId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext
                }, unlinkCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent, errorCallback);
                });
#else
                PlayFabClientAPI.UnlinkCustomID(new UnlinkCustomIDRequest
                {
                    CustomId = PlayFabSettings.DeviceUniqueIdentifier,
                    AuthenticationContext = authService.AuthenticationContext
                }, unlinkCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent);
                }, errorCallback =>
                {
                    authService.InvokeUnlink(AuthTypes.Silent, errorCallback);
                });
#endif
            }, errorCallback => authService.InvokeUnlink(AuthTypes.Silent, errorCallback));
        }
    }
}