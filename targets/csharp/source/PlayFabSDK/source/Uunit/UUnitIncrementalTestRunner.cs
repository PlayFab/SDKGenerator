using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

#if !DISABLE_PLAYFABCLIENT_API
using PlayFab.ClientModels;
#endif

namespace PlayFab.UUnit
{
    public class TestTitleData
    {
        public string titleId;
#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API
        public string developerSecretKey;
#endif
        public string userEmail;
        public Dictionary<string, string> extraHeaders;
    }
    public static class UUnitIncrementalTestRunner
    {
        public static bool SuiteFinished { get; private set; }
        public static bool AllTestsPassed { get; private set; }
        public static string Summary { get; private set; }
        private static UUnitTestSuite _suite;
        private static bool _postResultsToCloudscript;
        public static TestTitleData TestTitleData;

#if !DISABLE_PLAYFABCLIENT_API
        public static PlayFabClientInstanceAPI PfClient = new PlayFabClientInstanceAPI(new PlayFabApiSettings(), new PlayFabAuthenticationContext());
        private static Action<PlayFabResult<ExecuteCloudScriptResult>> _onComplete;
#endif

        public static TestTitleData VerifyTestTitleData()
        {
#if NET45 || NETCOREAPP2_0
            if(TestTitleData == null)
            {
                try
                {
                    var testTitleDataPath = Environment.GetEnvironmentVariable("PF_TEST_TITLE_DATA_JSON");
                    var jsonContent = File.ReadAllText(testTitleDataPath + "/testTitleData.json");
                    TestTitleData = PlayFabSimpleJson.DeserializeObject<TestTitleData>(jsonContent);
                }
                catch (Exception)
                {
                }
            }
#endif
            // Fall back on hard coded testTitleData if necessary (Put your own data here)
            if (TestTitleData == null)
                TestTitleData = new TestTitleData { titleId = "6195", userEmail = "paul@playfab.com" };

            PlayFabSettings.staticSettings.TitleId = TestTitleData.titleId;

            return TestTitleData;
        }

        public static void Start(bool postResultsToCloudscript = true, string filter = null, TestTitleData testInputs = null
#if !DISABLE_PLAYFABCLIENT_API
            , Action<PlayFabResult<ExecuteCloudScriptResult>> onComplete = null
#endif
        )
        {
            TestTitleData = testInputs;
            VerifyTestTitleData();

#if !DISABLE_PLAYFABCLIENT_API
            PlayFabApiTest.SetTitleInfo(TestTitleData);
#endif
#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
            InstanceAuthTests.SetTitleInfo(TestTitleData);
            PlayFabQosApiTest.SetTitleInfo(TestTitleData);
#endif
#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API
            PlayFabServerApiTest.SetTitleInfo(TestTitleData);
#endif

            SuiteFinished = false;
            AllTestsPassed = false;
            _postResultsToCloudscript = postResultsToCloudscript;
            _suite = new UUnitTestSuite();
            _suite.FindAndAddAllTestCases(typeof(UUnitTestCase), filter);
#if !DISABLE_PLAYFABCLIENT_API
            _onComplete = onComplete;
#endif
        }

        public static async Task<string> Tick()
        {
            if (SuiteFinished)
                return Summary;

            SuiteFinished = _suite.TickTestSuite();
            Summary = _suite.GenerateTestSummary();
            AllTestsPassed = _suite.AllTestsPassed();

            if (SuiteFinished)
                await OnSuiteFinish();

            return Summary;
        }

        private static async Task OnSuiteFinish()
        {
            if (_postResultsToCloudscript)
                await PostTestResultsToCloudScript(_suite.GetInternalReport());
        }

        private static async Task PostTestResultsToCloudScript(TestSuiteReport testReport)
        {
#if !DISABLE_PLAYFABCLIENT_API
            PfClient.apiSettings.TitleId = TestTitleData.titleId;
            var loginRequest = new LoginWithCustomIDRequest
            {
                CustomId = PlayFabSettings.BuildIdentifier,
                CreateAccount = true,
            };
            var saveRequest = new ExecuteCloudScriptRequest
            {
                FunctionName = "SaveTestData",
                FunctionParameter = new Dictionary<string, object> { { "customId", PlayFabSettings.BuildIdentifier }, { "testReport", new[] { testReport } } },
                GeneratePlayStreamEvent = true
            };
            try
            {
                var loginResult = await PfClient.LoginWithCustomIDAsync(loginRequest);
                var saveResult = await PfClient.ExecuteCloudScriptAsync(saveRequest);
                _onComplete?.Invoke(saveResult);
            }
            catch (Exception e)
            {
                var failResult = new PlayFabResult<ExecuteCloudScriptResult>();
                failResult.Error = new PlayFabError();
                failResult.Error.ErrorMessage = e.ToString();
                _onComplete?.Invoke(failResult);
            }
#endif
        }
    }
}
