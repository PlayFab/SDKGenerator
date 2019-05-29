namespace PlayFab.UUnit
{
    using System;
    using QoS;
    using ServerModels;

    public class PlayFabQosApiTest : UUnitTestCase
    {
        private static TestTitleData testTitleData;

        // Functional
        private static bool TITLE_INFO_SET = false;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            TITLE_INFO_SET = true;
            testTitleData = testInputs;
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            if (!TITLE_INFO_SET)
                testContext.Skip(); // We cannot do client tests if the titleId is not given
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // No work needed, async tests will end themselves
        }

        /// <summary>
        /// SERVER API
        /// Each API instance can be used to login a player separately from any other API instances,
        /// and that player’s authentication context is stored in the API instance
        /// </summary>
        [UUnitTest]
        public void QosTest(UUnitTestContext testContext)
        {
            var loginWithServerCustomIdRequest = new LoginWithServerCustomIdRequest()
            {
                CreateAccount = true,
                ServerCustomId = "test_Instance1",
            };

            try
            {
                PlayFabSettings.staticSettings.TitleId = testTitleData.titleId;
                PlayFabSettings.staticSettings.DeveloperSecretKey = testTitleData.developerSecretKey;
                PlayFabResult<ServerLoginResult> serverLoginResult = PlayFabServerAPI.LoginWithServerCustomIdAsync(loginWithServerCustomIdRequest, null, testTitleData.extraHeaders).Result;
                PlayFabSettings.staticPlayer.EntityToken = serverLoginResult.Result.EntityToken.EntityToken;
                PlayFabSettings.staticPlayer.PlayFabId = serverLoginResult.Result.PlayFabId;
                PlayFabSettings.staticPlayer.ClientSessionTicket = serverLoginResult.Result.SessionTicket;

            }
            catch (AggregateException aggregateException) when (aggregateException.InnerException != null)
            {
                throw aggregateException.InnerException;
            }

            PlayFabQosApi playFabQosApi = new PlayFabQosApi();
            QosResult qoSResult = playFabQosApi.GetQosResultAsync().Result;

            testContext.IntEquals(0, qoSResult.ErrorCode, $"Qos error: expected ErrorCode 0, actual ErrorCode {qoSResult.ErrorCode}");
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
