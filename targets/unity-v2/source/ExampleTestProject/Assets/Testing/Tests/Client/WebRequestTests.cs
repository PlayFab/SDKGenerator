#if !DISABLE_PLAYFABCLIENT_API

using System;
using System.Collections.Generic;
using PlayFab.ClientModels;
using PlayFab.Internal;

namespace PlayFab.UUnit
{
    public class WebRequestTests : UUnitTestCase
    {
        private TestTitleDataLoader.TestTitleData testTitleData;
        private static readonly PlayFabApiSettings clientSettings = new PlayFabApiSettings();
        private static readonly PlayFabAuthenticationContext clientContext = new PlayFabAuthenticationContext();
        
        private static readonly PlayFabClientInstanceAPI clientInstance = new PlayFabClientInstanceAPI(clientSettings, clientContext);


        int originalTimeout = 0;
        WebRequestType originalWebRequestType = WebRequestType.UnityWebRequest;

        public override void ClassSetUp()
        {
            testTitleData = TestTitleDataLoader.LoadTestTitleData();
            clientSettings.TitleId = testTitleData.titleId;
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            originalTimeout = PlayFabSettings.RequestTimeout;
            originalWebRequestType = PlayFabSettings.RequestType;

            var titleInfoSet = !string.IsNullOrEmpty(clientSettings.TitleId);
            if (!titleInfoSet)
                testContext.Skip(); // We cannot do client tests if the titleId is not given
        }

        public override void Tick(UUnitTestContext testContext)
        {

        }

        public override void TearDown(UUnitTestContext testContext)
        {
            RestoreTimeoutSettings();
            clientSettings.AdvertisingIdType = null;
            clientSettings.AdvertisingIdValue = null;
        }

        public override void ClassTearDown()
        {
            clientInstance.ForgetAllCredentials();
        }

        [UUnitTest]
        private void UnityWebRequestTimeOutIgnoredTest(UUnitTestContext testContext)
        {
            PlayFabSettings.RequestTimeout = 1;
            PlayFabSettings.RequestType = WebRequestType.UnityWebRequest;

            var loginRequest = new LoginWithCustomIDRequest
            {
               CustomId = PlayFabSettings.BuildIdentifier,
               CreateAccount = true,
            };

            clientInstance.LoginWithCustomID(loginRequest, LoginTimeoutIgnored, LoginTimeoutIgnoredError, testContext);
        }

        private void LoginTimeoutIgnored(LoginResult result)
        {
            ((UUnitTestContext)result.CustomData).EndTest(UUnitFinishState.PASSED, null);
        }

        private void LoginTimeoutIgnoredError(PlayFabError result)
        {
            ((UUnitTestContext)result.CustomData).Fail("Failed with unexpected error: " + result.GenerateErrorReport());
        }

        void RestoreTimeoutSettings()
        {
           PlayFabSettings.RequestTimeout = originalTimeout;
           PlayFabSettings.RequestType = originalWebRequestType;
        }

    }
}

#endif
