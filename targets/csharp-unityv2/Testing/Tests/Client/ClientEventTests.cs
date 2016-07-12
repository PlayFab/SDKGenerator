#if !DISABLE_PLAYFABCLIENT_API
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using PlayFab.UUnit;
using PlayFab.ClientModels;
using PlayFab.SharedModels;
using PlayFab.Events;
using UnityEngine;

namespace PlayFab.Internal
{
    public class ClientEventTest : UUnitTestCase
    {
        private static HashSet<string> callbacks = new HashSet<string>();
        private static PlayFabEvents _PlayFabEvents;
        private EventInstanceListener _listener;

        private class EventInstanceListener
        {
            public void Register()
            {
                _PlayFabEvents = PlayFabEvents.Init();
                //Forcing initialization
                PlayFabSettings.RequestType = WebRequestType.HttpWebRequest;
                PlayFabHttp.instance.Awake();
                PlayFabHttp.InitializeHttp();

                _PlayFabEvents.OnLoginWithCustomIDRequestEvent += OnLoginWithCustomId;
                _PlayFabEvents.OnLoginResultEvent += OnLoginResult;
                _PlayFabEvents.OnGlobalErrorEvent += error => { callbacks.Add(error.ErrorMessage); };

                PlayFabHttp.ApiProcessingEventHandler += OnGlobalEventHandler;
            }

            private void OnGlobalEventHandler(ApiProcessingEventArgs eventArgs)
            {
                if (eventArgs.EventType == ApiProcessingEventType.Pre)
                {
                    callbacks.Add("OnRequest_InstGl");
                }
                else
                {
                    callbacks.Add("OnResponse_InstGl");
                }
            }

            public void Unregister()
            {
                _PlayFabEvents.UnregisterInstance(this);
            }

            private void OnLoginResult(LoginResult result)
            {
                callbacks.Add("OnResponse_InstLogin");
            }

            private void OnLoginWithCustomId(LoginWithCustomIDRequest request)
            {
                callbacks.Add("OnRequest_InstLogin");
            }
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            PlayFabSettings.TitleId = "6195";

            _listener = new EventInstanceListener();
            callbacks.Clear();
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // No async work needed
        }

        public override void TearDown(UUnitTestContext testContext)
        {
            callbacks.Clear();
            //PlayFabSettings.HideCallbackErrors = false;
            //PlayFabSettings.ForceUnregisterAll();  //TODO: ForceUnregisterAll();
        }

        private void SharedErrorCallback(PlayFabError error)
        {
            ((UUnitTestContext)error.CustomData).Fail(error.GenerateErrorReport());
        }

        private static void CheckCallbacks(UUnitTestContext testContext, string expected, HashSet<string> actual)
        {
            testContext.True(actual.Contains(expected), "Want: " + expected + ", Got: " + string.Join(", ", actual.ToArray()));
        }

        [UUnitTest]
        public void TestInstCallbacks_GeneralOnly(UUnitTestContext testContext)
        {
            _listener.Register();

            PlayFabClientAPI.LoginWithCustomID(new LoginWithCustomIDRequest { CreateAccount = true, CustomId = "UnitySdk-UnitTest", TitleId = "6195" }, PlayFabUUnitUtils.ApiActionWrapper<LoginResult>(testContext, TestInstCallbacks_GeneralOnlyCallback), null, testContext);
            testContext.True(callbacks.Contains("OnRequest_InstGl"), string.Join(", ", callbacks.ToArray()));
            testContext.True(callbacks.Contains("OnRequest_InstLogin"), string.Join(", ", callbacks.ToArray()));
            testContext.IntEquals(2, callbacks.Count, string.Join(", ", callbacks.ToArray()));
            callbacks.Clear();
        }
        private void TestInstCallbacks_GeneralOnlyCallback(LoginResult result)
        {
            var testContext = (UUnitTestContext)result.CustomData;
            testContext.True(callbacks.Contains("OnResponse_InstGl"), string.Join(", ", callbacks.ToArray())); // NOTE: This depends on the global callbacks happening before the local callback
            testContext.True(callbacks.Contains("OnResponse_InstLogin"), string.Join(", ", callbacks.ToArray())); // NOTE: This depends on the global callbacks happening before the local callback
            testContext.IntEquals(2, callbacks.Count, string.Join(", ", callbacks.ToArray()));
            testContext.EndTest(UUnitFinishState.PASSED, null);

            _listener.Unregister();
        }

        [UUnitTest]
        public void TestInstCallbacks_Local(UUnitTestContext testContext)
        {
            _listener.Register();

            PlayFabClientAPI.LoginWithCustomID(new LoginWithCustomIDRequest { CreateAccount = true, CustomId = "UnitySdk-UnitTest", TitleId = "6195" }, PlayFabUUnitUtils.ApiActionWrapper<LoginResult>(testContext, TestInstCallbacks_LocalCallback), null, testContext);
            CheckCallbacks(testContext, "OnRequest_InstGl", callbacks);
            CheckCallbacks(testContext, "OnRequest_InstLogin", callbacks);
            testContext.IntEquals(2, callbacks.Count, string.Join(", ", callbacks.ToArray()));
            callbacks.Clear();
        }
        private void TestInstCallbacks_LocalCallback(LoginResult result)
        {
            var testContext = (UUnitTestContext)result.CustomData;
            // NOTE: This depends on the global callbacks happening before the local callback
            CheckCallbacks(testContext, "OnResponse_InstGl", callbacks);
            CheckCallbacks(testContext, "OnResponse_InstLogin", callbacks);
            testContext.IntEquals(2, callbacks.Count, string.Join(", ", callbacks.ToArray()));
            testContext.EndTest(UUnitFinishState.PASSED, null);

            _listener.Unregister();
        }

        /// <summary>
        /// The user can provide functions that throw errors on callbacks.
        /// These should not affect the PlayFab api system itself.
        /// </summary>
        [UUnitTest]
        public void TestCallbackFailuresGlobal(UUnitTestContext testContext)
        {
            GetCatalogItemsRequest catalogRequest = new GetCatalogItemsRequest();
            PlayFabClientAPI.GetCatalogItems(catalogRequest, PlayFabUUnitUtils.ApiActionWrapper<GetCatalogItemsResult>(testContext, GetCatalogItemsCallback_Single), SharedErrorCallback, testContext);
        }
        private static void SuccessCallback_Global(string urlPath, int callId, object request, PlayFabResultCommon result, PlayFabError error, object customData)
        {
            callbacks.Add("SuccessCallback_Global");
            throw new Exception("Non-PlayFab callback error");
        }
        private static void GetCatalogItemsCallback_Single(GetCatalogItemsResult result)
        {
            callbacks.Add("GetCatalogItemsCallback_Single");

            var testContext = (UUnitTestContext)result.CustomData;
            // NOTE: This depends on the global callbacks happening before the local callback
            CheckCallbacks(testContext, "GetCatalogItemsCallback_Single", callbacks);
            CheckCallbacks(testContext, "SuccessCallback_Global", callbacks);
            testContext.IntEquals(2, callbacks.Count, string.Join(",", callbacks.ToArray()));
            testContext.EndTest(UUnitFinishState.PASSED, "");
        }

        /// <summary>
        /// The user can provide functions that throw errors on callbacks.
        /// These should not affect the PlayFab api system itself.
        /// </summary>
        [UUnitTest]
        public void TestCallbackFailuresLocal(UUnitTestContext testContext)
        {
            //PlayFabSettings.HideCallbackErrors = true;
            //PlayFabSettings.GlobalErrorHandler += SharedError_Global; TODO: ask Paul.


            RegisterPlayFabUserRequest registerRequest = new RegisterPlayFabUserRequest(); // A bad request that will fail
            PlayFabClientAPI.RegisterPlayFabUser(registerRequest, null, PlayFabUUnitUtils.ApiActionWrapper<PlayFabError>(testContext, SharedError_Single), testContext);
        }
        private static void SharedError_Global(PlayFabError error)
        {
            callbacks.Add("SharedError_Global");
            throw new Exception("Non-PlayFab callback error");
        }
        private static void SharedError_Single(PlayFabError error)
        {
            callbacks.Add("SharedError_Single");

            var testContext = (UUnitTestContext)error.CustomData;
            // NOTE: This depends on the global callbacks happening before the local callback
            CheckCallbacks(testContext, "SharedError_Single", callbacks);
            CheckCallbacks(testContext, "SharedError_Global", callbacks);
            testContext.IntEquals(2, callbacks.Count, string.Join(",", callbacks.ToArray()));
            testContext.EndTest(UUnitFinishState.PASSED, "");
        }
    }

}
#endif