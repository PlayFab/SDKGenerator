using System;
using System.Collections.Generic;
using System.Reflection;
using PlayFab.ClientModels;
using PlayFab.Internal;
using UnityEngine;

namespace PlayFab.Examples
{
    public class ExampleApiLog : MonoBehaviour
    {
        // Track timestamps for each api call, and report
        private static readonly Dictionary<int, DateTime> CallTimes_StGl = new Dictionary<int, DateTime>();
        private static readonly Dictionary<int, DateTime> CallTimes_InstGl = new Dictionary<int, DateTime>();
        private static readonly Dictionary<int, DateTime> CallTimes_StLogin = new Dictionary<int, DateTime>();
        private static readonly Dictionary<int, DateTime> CallTimes_InstLogin = new Dictionary<int, DateTime>();

        public void Awake()
        {
            // Instance methods must be cast to a delegate inside the registration function
            PlayFabSettings.RequestCallback<object> onApiRequestInstGl = OnApiRequest_InstGl; // Generic callbacks have to use the generic signature
            PlayFabSettings.ResponseCallback<object, PlayFabResultCommon> onApiResponseInstGl = OnApiResponse_InstGl; // Generic callbacks have to use the generic signature
            PlayFabClientAPI.LoginWithEmailAddressRequestCallback onApiRequestInstLogin = OnApiRequest_InstLogin;
            PlayFabClientAPI.LoginWithEmailAddressResponseCallback onApiResponseInstLogin = OnApiResponse_InstLogin;
            PlayFabSettings.RequestCallback<object> onApiRequestInstLogin2 = OnApiRequest_InstLogin2; // Generic callbacks have to use the generic signature
            PlayFabSettings.ResponseCallback<object, PlayFabResultCommon> onApiResponseInstLogin2 = OnApiResponse_InstLogin2; // Generic callbacks have to use the generic signature

            // Registering for instance methods, using the local delegate variables (bound to the "this" instance)
            PlayFabSettings.RegisterForRequests(null, onApiRequestInstGl);
            PlayFabSettings.RegisterForResponses(null, onApiResponseInstGl);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithEmailAddress", onApiRequestInstLogin);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithEmailAddress", onApiResponseInstLogin);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithAndroidDeviceID", onApiRequestInstLogin2);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithAndroidDeviceID", onApiResponseInstLogin2);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithIOSDeviceID", onApiRequestInstLogin2);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithIOSDeviceID", onApiResponseInstLogin2);

            // Registering for static methods, using the static delegate variables defined by each function
            PlayFabSettings.RegisterForRequests(null, _onApiRequestStGl);
            PlayFabSettings.RegisterForResponses(null, _onApiResponseStGl);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithEmailAddress", _onApiRequestStLogin);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithEmailAddress", _onApiResponseStLogin);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithAndroidDeviceID", _onApiRequestStLogin2);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithAndroidDeviceID", _onApiResponseStLogin2);
            PlayFabSettings.RegisterForRequests("/Client/LoginWithIOSDeviceID", _onApiRequestStLogin2);
            PlayFabSettings.RegisterForResponses("/Client/LoginWithIOSDeviceID", _onApiResponseStLogin2);
        }

        public void OnDestroy()
        {
            PlayFabSettings.UnregisterInstance(this); // Automatically unregisters all callbacks bound to this instance - No delegate casting or local variables needed for a full un-register

            // Un-registering for static methods, using the static delegate variables defined by each function - No simple way to identify/clear these together the instance
            PlayFabSettings.UnregisterForRequests(null, _onApiRequestStGl);
            PlayFabSettings.UnregisterForResponses(null, _onApiResponseStGl);
            PlayFabSettings.UnregisterForRequests("/Client/LoginWithEmailAddress", _onApiRequestStLogin);
            PlayFabSettings.UnregisterForResponses("/Client/LoginWithEmailAddress", _onApiResponseStLogin);
            PlayFabSettings.UnregisterForRequests("/Client/LoginWithAndroidDeviceID", _onApiRequestStLogin2);
            PlayFabSettings.UnregisterForResponses("/Client/LoginWithAndroidDeviceID", _onApiResponseStLogin2);
            PlayFabSettings.UnregisterForRequests("/Client/LoginWithIOSDeviceID", _onApiRequestStLogin2);
            PlayFabSettings.UnregisterForResponses("/Client/LoginWithIOSDeviceID", _onApiResponseStLogin2);
        }

        #region Static Callback Methods
        private static PlayFabSettings.RequestCallback<object> _onApiRequestStGl = OnApiRequest_StGl; // Generic callbacks have to use the generic signature - Static methods can be cast once and saved as a static variable
        private static void OnApiRequest_StGl(string url, int callId, object request, object customData)
        {
            CallTimes_StGl[callId] = DateTime.UtcNow;
        }

        private static PlayFabSettings.ResponseCallback<object, PlayFabResultCommon> _onApiResponseStGl = OnApiResponse_StGl; // Generic callbacks have to use the generic signature - Static methods can be cast once and saved as a static variable
        private static void OnApiResponse_StGl(string url, int callId, object request, object result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_StGl[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _StGl");
            CallTimes_StGl.Remove(callId);
        }

        private static PlayFabClientAPI.LoginWithEmailAddressRequestCallback _onApiRequestStLogin = OnApiRequest_StLogin; // Static methods can be cast once and saved as a static variable
        private static void OnApiRequest_StLogin(string url, int callId, LoginWithEmailAddressRequest request, object customData)
        {
            CallTimes_StLogin[callId] = DateTime.UtcNow;
        }

        private static PlayFabClientAPI.LoginWithEmailAddressResponseCallback _onApiResponseStLogin = OnApiResponse_StLogin; // Static methods can be cast once and saved as a static variable
        private static void OnApiResponse_StLogin(string url, int callId, LoginWithEmailAddressRequest request, LoginResult result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_StLogin[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _StLogin");
            CallTimes_StLogin.Remove(callId);
        }

        private static PlayFabSettings.RequestCallback<object> _onApiRequestStLogin2 = OnApiRequest_StLogin2; // Static methods can be cast once and saved as a static variable
        private static void OnApiRequest_StLogin2(string url, int callId, object request, object customData)
        {
            CallTimes_StLogin[callId] = DateTime.UtcNow;
        }

        private static PlayFabSettings.ResponseCallback<object, PlayFabResultCommon> _onApiResponseStLogin2 = OnApiResponse_StLogin2; // Static methods can be cast once and saved as a static variable
        private static void OnApiResponse_StLogin2(string url, int callId, object request, PlayFabResultCommon result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_StLogin[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _StLogin");
            CallTimes_StLogin.Remove(callId);
        }
        #endregion Static Callback Methods

        #region Instance Callback Methods
        private void OnApiRequest_InstGl(string url, int callId, object request, object customData)
        {
            CallTimes_InstGl[callId] = DateTime.UtcNow;
        }

        private void OnApiResponse_InstGl(string url, int callId, object request, object result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_InstGl[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _InstGl");
            CallTimes_InstGl.Remove(callId);
        }

        private void OnApiRequest_InstLogin(string url, int callId, LoginWithEmailAddressRequest request, object customData)
        {
            CallTimes_InstLogin[callId] = DateTime.UtcNow;
        }

        private void OnApiResponse_InstLogin(string url, int callId, LoginWithEmailAddressRequest request, LoginResult result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_InstLogin[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _InstLogin");
            CallTimes_InstLogin.Remove(callId);
        }

        private void OnApiRequest_InstLogin2(string url, int callId, object request, object customData)
        {
            CallTimes_InstLogin[callId] = DateTime.UtcNow;
        }

        private void OnApiResponse_InstLogin2(string url, int callId, object request, PlayFabResultCommon result, PlayFabError error, object customData)
        {
            var delta = DateTime.UtcNow - CallTimes_InstLogin[callId];
            Debug.Log(url + " completed in " + delta.TotalMilliseconds + " - _InstLogin");
            CallTimes_InstLogin.Remove(callId);
        }
        #endregion Instance Callback Methods
    }
}
