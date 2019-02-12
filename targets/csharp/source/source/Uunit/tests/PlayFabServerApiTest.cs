#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API 
using PlayFab.Internal;
using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using PlayFab.AuthenticationModels;
using PlayFab.DataModels;
using PlayFab.ServerModels;

namespace PlayFab.UUnit
{
    public class PlayFabServerApiTest : UUnitTestCase
    {
        private static TestTitleData testTitleData;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            testTitleData = testInputs;
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
            PlayFabApiSettings settings = new PlayFabApiSettings();
            settings.TitleId = PlayFabSettings.TitleId;

            PlayFabAuthenticationContext context = new PlayFabAuthenticationContext();
            context.DeveloperSecretKey = testTitleData.developerSecretKey;

            try
            {
                PlayFabServerInstanceAPI serverInstanceWithoutAnyParameter = new PlayFabServerInstanceAPI();
                PlayFabServerInstanceAPI serverInstanceWithSettings = new PlayFabServerInstanceAPI(settings);
                PlayFabServerInstanceAPI serverInstanceWithContext = new PlayFabServerInstanceAPI(context);
                PlayFabServerInstanceAPI serverInstanceWithSameParameter = new PlayFabServerInstanceAPI(context);
                PlayFabServerInstanceAPI serverInstanceWithSettingsAndContext = new PlayFabServerInstanceAPI(settings, context);
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception)
            {
                testContext.Fail("Multi Intance Server api can not be created");
            }
        }

        /// <summary>
        /// SERVER API
        /// Different instances of the same API class may have different API settings and use them
        /// </summary>
        [UUnitTest]
        public void MultipleInstanceWithDifferentSettings(UUnitTestContext testContext)
        {
            PlayFabApiSettings settings = new PlayFabApiSettings();
            settings.ProductionEnvironmentUrl = "https://test1.playfabapi.com";
            settings.TitleId = "test1";

            PlayFabApiSettings settings2 = new PlayFabApiSettings();
            settings2.ProductionEnvironmentUrl = "https://test2.playfabapi.com";
            settings2.TitleId = "test2";

            PlayFabAuthenticationContext context = new PlayFabAuthenticationContext();
            context.DeveloperSecretKey = "key1";

            PlayFabAuthenticationContext context2 = new PlayFabAuthenticationContext();
            context2.DeveloperSecretKey = "key2";

            try
            {
                PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(settings, context);
                PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings2, context2);

                testContext.StringEquals("test1", serverInstance1.GetSettings().TitleId, "MultipleInstanceWithDifferentSettings can not be completed");
                testContext.StringEquals("https://test1.playfabapi.com", serverInstance1.GetSettings().ProductionEnvironmentUrl, "MultipleInstanceWithDifferentSettings can not be completed");
                testContext.StringEquals("key1", serverInstance1.GetAuthenticationContext().DeveloperSecretKey, "MultipleInstanceWithDifferentSettings can not be completed");

                testContext.StringEquals("test2", serverInstance2.GetSettings().TitleId, "MultipleInstanceWithDifferentSettings can not be completed");
                testContext.StringEquals("https://test2.playfabapi.com", serverInstance2.GetSettings().ProductionEnvironmentUrl, "MultipleInstanceWithDifferentSettings can not be completed");
                testContext.StringEquals("key2", serverInstance2.GetAuthenticationContext().DeveloperSecretKey, "MultipleInstanceWithDifferentSettings can not be completed");
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception)
            {
                testContext.Fail("Multi Intance Server api can not be created");
            }
        }

        /// <summary>
        /// SERVER API
        /// Each API instance can be used to login a player separately from any other API instances, 
        /// and that player’s authentication context is stored in the API instance
        /// </summary>
        [UUnitTest]
        public void ApiInstanceLogin(UUnitTestContext testContext)
        {
            PlayFabApiSettings settings = new PlayFabApiSettings();
            settings.TitleId = PlayFabSettings.TitleId;

            PlayFabAuthenticationContext context = new PlayFabAuthenticationContext();
            context.DeveloperSecretKey = testTitleData.developerSecretKey;

            var loginRequest1 = new LoginWithServerCustomIdRequest()
            {
                CreateAccount = true,
                ServerCustomId = "test_Instance1",
                AuthenticationContext = context
            };

            var loginRequest2 = new LoginWithServerCustomIdRequest()
            {
                CreateAccount = true,
                ServerCustomId = "test_Instance2",
                AuthenticationContext = context
            };

            try
            {
                PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(settings, context);
                PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings, context);

                var result1 = serverInstance1.LoginWithServerCustomIdAsync(loginRequest1, null, testTitleData.extraHeaders).Result;
                var result2 = serverInstance2.LoginWithServerCustomIdAsync(loginRequest2, null, testTitleData.extraHeaders).Result;

                testContext.NotNull(result1.Result, "serverInstace1 login failed");
                testContext.NotNull(result2.Result, "serverInstance2 login failed");
                testContext.IsNull(result1.Error, "serverInstance1 got error: " + result1.Error?.ErrorMessage ?? string.Empty);
                testContext.IsNull(result2.Error, "serverInstance2 got error: " + result2.Error?.ErrorMessage ?? string.Empty);
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception)
            {
                testContext.Fail("Multi Intance Server api can not be created");
            }
        }

        /// <summary>
        /// SERVER API
        /// If API settings object is not set by a customer developer for an instance of an API class then the
        /// API instance always uses the static PlayFabSettings class (the same way as static API classes)
        /// </summary>
        [UUnitTest]
        public void CheckWithNoSettings(UUnitTestContext testContext)
        {
            PlayFabSettings.DeveloperSecretKey = testTitleData.developerSecretKey;

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
            PlayFabSettings.DeveloperSecretKey = testTitleData.developerSecretKey;

            //IT will  use static developer key - Should has no error 
            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI();
            var result = serverInstance1.GetAllSegmentsAsync(new GetAllSegmentsRequest()).Result;

            PlayFabAuthenticationContext context = new PlayFabAuthenticationContext();
            context.DeveloperSecretKey = "WRONGKEYTOFAIL";

            //IT will  use context developer key - Should has error because of wrong key
            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(context);
            var result2 = serverInstance2.GetAllSegmentsAsync(new GetAllSegmentsRequest()).Result;

            try
            {
                testContext.NotNull(result.Result, "Server Instance1 result is null");
                testContext.IsNull(result.Error, "Server Instance1 result got error message : " + result.Error?.ErrorMessage ?? string.Empty);
                testContext.IsNull(result2.Result, "Server Instance2 result is not null");
                testContext.NotNull(result2.Error, "Server Instance2 got no error message");
                testContext.IntEquals(401, result2.Error.HttpCode, "Server Instance2 got wrong error");
                testContext.EndTest(UUnitFinishState.PASSED, null);
            }
            catch (Exception ex)
            {
                testContext.Fail("CheckWithAuthContextAndWithoutAuthContext failed : " + ex.Message);
            }
        }

        /// <summary>
        /// SERVER API
        /// Try to parallel request at same time
        /// </summary>
        [UUnitTest]
        public void ParallelRequest(UUnitTestContext testContext)
        {
            List<Task> tasks = new List<Task>();

            PlayFabApiSettings settings = new PlayFabApiSettings();
            settings.TitleId = PlayFabSettings.TitleId;

            PlayFabAuthenticationContext context = new PlayFabAuthenticationContext();
            context.DeveloperSecretKey = testTitleData.developerSecretKey;

            PlayFabAuthenticationContext context2 = new PlayFabAuthenticationContext();
            context2.DeveloperSecretKey = "GETERROR";

            PlayFabAuthenticationContext context3 = new PlayFabAuthenticationContext();
            context3.DeveloperSecretKey = testTitleData.developerSecretKey;

            PlayFabAuthenticationContext context4 = new PlayFabAuthenticationContext();
            context4.DeveloperSecretKey = "TESTKEYERROR";

            PlayFabAuthenticationContext context5 = new PlayFabAuthenticationContext();
            context5.DeveloperSecretKey = "123421";


            PlayFabServerInstanceAPI serverInstance = new PlayFabServerInstanceAPI(settings, context);
            tasks.Add(serverInstance.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance1 = new PlayFabServerInstanceAPI(settings, context);
            tasks.Add(serverInstance1.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance2 = new PlayFabServerInstanceAPI(settings, context2);
            tasks.Add(serverInstance2.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance3 = new PlayFabServerInstanceAPI(settings, context3);
            tasks.Add(serverInstance3.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance4 = new PlayFabServerInstanceAPI(settings, context4);
            tasks.Add(serverInstance4.GetAllSegmentsAsync(new GetAllSegmentsRequest()));

            PlayFabServerInstanceAPI serverInstance5 = new PlayFabServerInstanceAPI(settings, context5);
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