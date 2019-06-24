#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab.ServerModels;

namespace PlayFab.UUnit
{
    public class PlayFabServerApiTest : UUnitTestCase
    {
        private static TestTitleData testTitleData;
        private static PlayFabApiSettings instanceSettings = new PlayFabApiSettings();
        private static PlayFabAuthenticationContext instanceContext = new PlayFabAuthenticationContext();

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            testTitleData = testInputs;
            instanceSettings.TitleId = testTitleData.titleId;
            instanceSettings.DeveloperSecretKey = testTitleData.developerSecretKey;
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            // Clear the global settings, so they can't pollute this test.
            PlayFabSettings.staticSettings.TitleId = null;
            PlayFabSettings.staticSettings.DeveloperSecretKey = null;
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // No work needed, async tests will end themselves
        }

        /// <summary>
        /// SERVER API
        /// Multiple instances of the same API class can be created
        /// </summary>
        [UUnitTest]
        public void CreateMultipleServerInstance(UUnitTestContext testContext)
        {
            PlayFabServerInstanceAPI serverInstanceWithoutAnyParameter = new PlayFabServerInstanceAPI();
            PlayFabServerInstanceAPI serverInstanceWithSettings = new PlayFabServerInstanceAPI(instanceSettings);
            PlayFabServerInstanceAPI serverInstanceWithContext = new PlayFabServerInstanceAPI(instanceContext);
            PlayFabServerInstanceAPI serverInstanceWithSameParameter = new PlayFabServerInstanceAPI(instanceContext);
            PlayFabServerInstanceAPI serverInstanceWithSettingsAndContext = new PlayFabServerInstanceAPI(instanceSettings, instanceContext);
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// SERVER API
        /// Different instances of the same API class may have different API settings and use them
        /// </summary>
        [UUnitTest]
        public void MultipleInstanceWithDifferentSettings(UUnitTestContext testContext)
        {
            PlayFabApiSettings settings1 = new PlayFabApiSettings();
            settings1.ProductionEnvironmentUrl = "https://test1.playfabapi.com";
            settings1.TitleId = "test1";
            settings1.DeveloperSecretKey = "key1";

            PlayFabApiSettings settings2 = new PlayFabApiSettings();
            settings2.ProductionEnvironmentUrl = "https://test2.playfabapi.com";
            settings2.TitleId = "test2";
            settings2.DeveloperSecretKey = "key2";

            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(settings1, null);
            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings2, null);

            testContext.StringEquals("test1", serverInstance1.apiSettings.TitleId, "MultipleInstanceWithDifferentSettings can not be completed");
            testContext.StringEquals("https://test1.playfabapi.com", serverInstance1.apiSettings.ProductionEnvironmentUrl, "MultipleInstanceWithDifferentSettings can not be completed");
            testContext.StringEquals("key1", serverInstance1.apiSettings.DeveloperSecretKey, "MultipleInstanceWithDifferentSettings can not be completed");

            testContext.StringEquals("test2", serverInstance2.apiSettings.TitleId, "MultipleInstanceWithDifferentSettings can not be completed");
            testContext.StringEquals("https://test2.playfabapi.com", serverInstance2.apiSettings.ProductionEnvironmentUrl, "MultipleInstanceWithDifferentSettings can not be completed");
            testContext.StringEquals("key2", serverInstance2.apiSettings.DeveloperSecretKey, "MultipleInstanceWithDifferentSettings can not be completed");
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// SERVER API
        /// Each API instance can be used to login a player separately from any other API instances,
        /// and that player’s authentication context is stored in the API instance
        /// </summary>
        [UUnitTest]
        public void ApiInstanceLogin(UUnitTestContext testContext)
        {
            var loginRequest1 = new LoginWithServerCustomIdRequest()
            {
                CreateAccount = true,
                ServerCustomId = "test_Instance1",
                AuthenticationContext = instanceContext
            };

            var loginRequest2 = new LoginWithServerCustomIdRequest()
            {
                CreateAccount = true,
                ServerCustomId = "test_Instance2",
                AuthenticationContext = instanceContext
            };

            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(instanceSettings, instanceContext);
            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(instanceSettings, instanceContext);

            PlayFabResult<ServerLoginResult> result1, result2;
            try
            {
                result1 = serverInstance1.LoginWithServerCustomIdAsync(loginRequest1, null, testTitleData.extraHeaders).Result;
                result2 = serverInstance2.LoginWithServerCustomIdAsync(loginRequest2, null, testTitleData.extraHeaders).Result;
            }
            catch (AggregateException e)
            {
                throw e.InnerException;
            }

            testContext.IsNull(result1?.Error, result1?.Error?.GenerateErrorReport());
            testContext.IsNull(result2?.Error, result2?.Error?.GenerateErrorReport());
            testContext.NotNull(result1.Result);
            testContext.NotNull(result2.Result);
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// SERVER API
        /// If API settings object is not set by a customer developer for an instance of an API class then the
        /// API instance always uses the static PlayFabSettings class (the same way as static API classes)
        /// </summary>
        [UUnitTest]
        public void CheckWithNoSettings(UUnitTestContext testContext)
        {
            PlayFabSettings.staticSettings.DeveloperSecretKey = testTitleData.developerSecretKey;

            //It should work with static class only
            PlayFabServerInstanceAPI serverInstanceWithoutAnyParameter = new PlayFabServerInstanceAPI();
            var getAllSegmentsTask = serverInstanceWithoutAnyParameter.GetAllSegmentsAsync(new GetAllSegmentsRequest());
            ContinueWithContext(getAllSegmentsTask, testContext, null, false, "Work with no settings failed", true);
        }

        /// <summary>
        /// SERVER API
        /// Try to check server instance with authentication context and without authentication context
        /// </summary>
        [UUnitTest]
        public void CheckWithAuthContextAndWithoutAuthContext(UUnitTestContext testContext)
        {
            PlayFabSettings.staticSettings.TitleId = testTitleData.titleId;
            PlayFabSettings.staticSettings.DeveloperSecretKey = testTitleData.developerSecretKey;

            //IT will  use static developer key - Should has no error
            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI();

            //IT will  use context developer key - Should has error because of wrong key
            PlayFabApiSettings settings2 = new PlayFabApiSettings();
            settings2.TitleId = testTitleData.titleId;
            settings2.DeveloperSecretKey = "WRONGKEYTOFAIL";
            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings2);

            PlayFabResult<GetAllSegmentsResult> result1, result2;

            try
            {
                result1 = serverInstance1.GetAllSegmentsAsync(new GetAllSegmentsRequest()).Result;
                result2 = serverInstance2.GetAllSegmentsAsync(new GetAllSegmentsRequest()).Result;
            }
            catch (AggregateException e)
            {
                throw e.InnerException;
            }

            testContext.IsNull(result1.Error, result1?.Error?.GenerateErrorReport());
            testContext.NotNull(result1.Result, "Server Instance1 result is null");

            testContext.NotNull(result2.Error, result2?.Error?.GenerateErrorReport());
            testContext.IsNull(result2.Result, result2?.Error?.GenerateErrorReport());
            testContext.IntEquals(401, result2.Error.HttpCode, "Server Instance2 got wrong error");

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// SERVER API
        /// Try to parallel request at same time
        /// </summary>
        [UUnitTest]
        public void ParallelRequest(UUnitTestContext testContext)
        {
            List<Task> tasks = new List<Task>();

            PlayFabApiSettings settings1 = new PlayFabApiSettings();
            settings1.TitleId = testTitleData.titleId;
            settings1.DeveloperSecretKey = testTitleData.developerSecretKey;

            PlayFabApiSettings settings2 = new PlayFabApiSettings();
            settings2.TitleId = testTitleData.titleId;
            settings2.DeveloperSecretKey = "GETERROR";

            PlayFabApiSettings settings3 = new PlayFabApiSettings();
            settings3.TitleId = testTitleData.titleId;
            settings3.DeveloperSecretKey = testTitleData.developerSecretKey;

            PlayFabApiSettings settings4 = new PlayFabApiSettings();
            settings4.TitleId = testTitleData.titleId;
            settings4.DeveloperSecretKey = "TESTKEYERROR";

            PlayFabApiSettings settings5 = new PlayFabApiSettings();
            settings5.TitleId = testTitleData.titleId;
            settings5.DeveloperSecretKey = "123421";


            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(settings1);
            tasks.Add(serverInstance1.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings2);
            tasks.Add(serverInstance2.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance3 = new PlayFabServerInstanceAPI(settings3);
            tasks.Add(serverInstance3.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance4 = new PlayFabServerInstanceAPI(settings4);
            tasks.Add(serverInstance4.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance5 = new PlayFabServerInstanceAPI(settings5);
            tasks.Add(serverInstance5.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            Task.WhenAll(tasks).ContinueWith(whenAll =>
            {
                if (!whenAll.IsCanceled && !whenAll.IsFaulted)
                {
                    testContext.EndTest(UUnitFinishState.PASSED, null);
                }
                else
                {
                    testContext.Fail("Parallel Requests failed " + whenAll.Exception.Flatten().Message);
                }
            });
        }
    }
}
#endif
