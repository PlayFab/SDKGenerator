using JenkinsConsoleUtility.Commands;
using JenkinsConsoleUtility.Util;
using PlayFab;
using PlayFab.ClientModels;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Testing
{
    public class CloudScriptTests : UUnitTestCase
    {
        private const string TEST_CUSTOM_ID = "JCU_UnitTest_1337";
        private CsGetRequest getRequest = new CsGetRequest { customId = TEST_CUSTOM_ID };
        private CsSaveRequest saveRequest = new CsSaveRequest { customId = TEST_CUSTOM_ID, testReport = new TestSuiteReport[0]};

        private TestTitleData testTitleData = null;

        public override void SetUp(UUnitTestContext testContext)
        {
            testTitleData = TestTitleDataLoader.Load(null);
            PlayFabSettings.TitleId = testTitleData.titleId;

            var task = PlayFabClientAPI.LoginWithCustomIDAsync(new LoginWithCustomIDRequest { CreateAccount = true, CustomId = TEST_CUSTOM_ID, TitleId = testTitleData.titleId });
            task.Wait();

            testContext.True(PlayFabClientAPI.IsClientLoggedIn(), "User login not successful: " + PlayFabUtil.GetErrorReport(task.Result.Error));
        }

        /// <summary>
        /// Verify that:
        ///   CSfunc_GetTestData clears any potential existing data
        ///   CSfunc_SaveTestData adds test data
        ///   CSfunc_TestDataExists can correctly verify both states
        /// </summary>
        [UUnitTest]
        public void WriteTestSequence(UUnitTestContext testContext)
        {
            bool functionResult, callResult;
            string getErrorReport, saveErrorReport, fetchErrorReport;
            TestSuiteReport[] testResults;
            object nullReturn;

            // Reset a previous test if relevant
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncGetTestData, getRequest, testTitleData.extraHeaders, out testResults, out fetchErrorReport);
            //UUnitAssert.True(callResult, fetchErrorReport);

            // Verify that no data pre-exists
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncTestDataExists, getRequest, testTitleData.extraHeaders, out functionResult, out getErrorReport);
            testContext.True(callResult, getErrorReport);
            testContext.False(functionResult, getErrorReport);

            // Save some data
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncSaveTestData, saveRequest, testTitleData.extraHeaders, out nullReturn, out saveErrorReport);
            testContext.True(callResult, saveErrorReport);

            // Verify that the saved data exists
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncTestDataExists, getRequest, testTitleData.extraHeaders, out functionResult, out getErrorReport);
            testContext.True(callResult, getErrorReport);
            testContext.True(functionResult, saveErrorReport);

            // Fetch that data
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncGetTestData, getRequest, testTitleData.extraHeaders, out testResults, out fetchErrorReport);
            testContext.True(callResult, fetchErrorReport);
            testContext.NotNull(testResults, fetchErrorReport);

            // Verify that it was consumed
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CsFuncTestDataExists, getRequest, testTitleData.extraHeaders, out functionResult, out getErrorReport);
            testContext.True(callResult, getErrorReport);
            testContext.False(functionResult, getErrorReport);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
    }
}
