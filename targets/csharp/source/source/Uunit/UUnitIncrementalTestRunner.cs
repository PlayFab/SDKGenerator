using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.IO;
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
        private static Action<PlayFabResult<ExecuteCloudScriptResult>> _onComplete;
#endif

        public static TestTitleData LoadTestTitleData(TestTitleData testInputs = null)
        {
#if NET45 || NETCOREAPP2_0
            if(testInputs == null)
            {
                try
                {
                    var testTitleDataPath = Environment.GetEnvironmentVariable("PF_TEST_TITLE_DATA_JSON");
                    var jsonContent = File.ReadAllText(testTitleDataPath + "/testTitleData.json");
                    testInputs = PlayFabSimpleJson.DeserializeObject<TestTitleData>(jsonContent);
                }
                catch (Exception)
                {
                }
            }
#endif
            // Fall back on hard coded testTitleData if necessary (Put your own data here)
            if (testInputs == null)
                testInputs = new TestTitleData { titleId = "6195", userEmail = "paul@playfab.com" };

            PlayFabSettings.TitleId = testInputs.titleId;

            return testInputs;
        }

        public static void Start(bool postResultsToCloudscript = true, string filter = null, TestTitleData testInputs = null
#if !DISABLE_PLAYFABCLIENT_API
            , Action<PlayFabResult<ExecuteCloudScriptResult>> onComplete = null
#endif
        )
        {
            testInputs = LoadTestTitleData(testInputs);

#if !DISABLE_PLAYFABCLIENT_API
            PlayFabApiTest.SetTitleInfo(testInputs);
#endif
#if ENABLE_PLAYFABSERVER_API || ENABLE_PLAYFABADMIN_API
            PlayFabServerApiTest.SetTitleInfo(testInputs);
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

        public static string Tick()
        {
            if (SuiteFinished)
                return Summary;

            SuiteFinished = _suite.TickTestSuite();
            Summary = _suite.GenerateTestSummary();
            AllTestsPassed = _suite.AllTestsPassed();

            if (SuiteFinished)
                OnSuiteFinish();

            return Summary;
        }

        private static void OnSuiteFinish()
        {
            if (_postResultsToCloudscript)
                PostTestResultsToCloudScript(_suite.GetInternalReport());
        }

        private static void PostTestResultsToCloudScript(TestSuiteReport testReport)
        {
#if !DISABLE_PLAYFABCLIENT_API
            var request = new ExecuteCloudScriptRequest
            {
                FunctionName = "SaveTestData",
                FunctionParameter = new Dictionary<string, object> { { "customId", PlayFabSettings.BuildIdentifier }, { "testReport", new[] { testReport } } },
                GeneratePlayStreamEvent = true
            };
            var saveTask = PlayFabClientAPI.ExecuteCloudScriptAsync(request);
            saveTask.ContinueWith(task =>
            {
                if (_onComplete != null)
                    _onComplete(task.Result);
            }
            );
#endif
        }
    }
}
