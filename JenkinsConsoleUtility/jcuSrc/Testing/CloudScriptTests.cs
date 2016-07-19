using JenkinsConsoleUtility.Commands;
using PlayFab;
using PlayFab.ClientModels;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Testing
{
    public class CloudScriptTests : UUnitTestCase
    {
        private const string TITLE_ID = "6195";
        private const string TEST_CUSTOM_ID = "pg_unity_1337";
        private CsGetRequest getRequest = new CsGetRequest { customId = TEST_CUSTOM_ID };
        private CsSaveRequest saveRequest = new CsSaveRequest { customId = TEST_CUSTOM_ID, testReport = new TestSuiteReport[0]};

        protected override void SetUp()
        {
            PlayFabSettings.TitleId = TITLE_ID;
            var task = PlayFabClientAPI.LoginWithCustomIDAsync(new LoginWithCustomIDRequest { CreateAccount = true, CustomId = TEST_CUSTOM_ID, TitleId = TITLE_ID});
            task.Wait();

            UUnitAssert.True(PlayFabClientAPI.IsClientLoggedIn(), "User login not successful: " + PlayFabUtil.GetErrorReport(task.Result.Error));
        }

        /// <summary>
        /// Verify that:
        ///   CSfunc_GetTestData clears any potential existing data
        ///   CSfunc_SaveTestData adds test data
        ///   CSfunc_TestDataExists can correctly verify both states
        /// </summary>
        [UUnitTest]
        public void WriteTestSequence()
        {
            bool functionResult, callResult;
            string getErrorReport, saveErrorReport, fetchErrorReport;
            TestSuiteReport[] testResults;
            object nullReturn;

            // Reset a previous test if relevant
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_GetTestData, getRequest, out testResults, out fetchErrorReport);
            //UUnitAssert.True(callResult, fetchErrorReport);

            // Verify that no data pre-exists
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_TestDataExists, getRequest, out functionResult, out getErrorReport);
            UUnitAssert.True(callResult, getErrorReport);
            UUnitAssert.False(functionResult, getErrorReport);

            // Save some data
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_SaveTestData, saveRequest, out nullReturn, out saveErrorReport);
            UUnitAssert.True(callResult, saveErrorReport);

            // Verify that the saved data exists
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_TestDataExists, getRequest, out functionResult, out getErrorReport);
            UUnitAssert.True(callResult, getErrorReport);
            UUnitAssert.True(functionResult, saveErrorReport);

            // Fetch that data
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_GetTestData, getRequest, out testResults, out fetchErrorReport);
            UUnitAssert.True(callResult, fetchErrorReport);
            UUnitAssert.NotNull(testResults, fetchErrorReport);

            // Verify that it was consumed
            callResult = CloudScriptListener.ExecuteCloudScript(CloudScriptListener.CSfunc_TestDataExists, getRequest, out functionResult, out getErrorReport);
            UUnitAssert.True(callResult, getErrorReport);
            UUnitAssert.False(functionResult, getErrorReport);
        }
    }
}
