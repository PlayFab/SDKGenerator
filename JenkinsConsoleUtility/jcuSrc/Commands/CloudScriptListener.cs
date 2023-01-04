using PlayFab;
using PlayFab.ClientModels;
using PlayFab.UUnit;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using JenkinsConsoleUtility.Util;

namespace JenkinsConsoleUtility.Commands
{
    public class CsGetRequest
    {
        public string customId;
    }
    public class CsSaveRequest
    {
        // IGNORE RESHARPER HERE - These names are used in every sdk
        public string customId;
        public TestSuiteReport[] testReport;
    }

    public class CloudScriptListener : ICommand
    {
        /// <summary>
        /// How long to wait between each CloudScript call to check for test data
        /// 1000 was hitting the server pretty hard, causing API-Call limits to be hit
        /// </summary>
        private const int TestDataExistsSleepTime = 4500;

        private static readonly string[] MyCommandKeys = { "ListenCS" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { "buildidentifier" };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        public const string CsFuncTestDataExists = "TestDataExists";
        public const string CsFuncGetTestData = "GetTestData";
        public const string CsFuncSaveTestData = "SaveTestData";

        private CsGetRequest _getRequest;
        private bool verbose;
        private readonly ISerializerPlugin json;

        private PlayFabClientInstanceAPI clientApi = new PlayFabClientInstanceAPI();

        public CloudScriptListener()
        {
            json = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
        }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var testTitleData = TestTitleDataLoader.Load(argsLc);
            var buildIdentifier = JenkinsConsoleUtility.GetArgVar(argsLc, "buildidentifier");
            var workspacePath = JenkinsConsoleUtility.GetArgVar(argsLc, "workspacePath", Environment.GetEnvironmentVariable("TEMP"));
            var timeout = TimeSpan.FromSeconds(int.Parse(JenkinsConsoleUtility.GetArgVar(argsLc, "timeout", "30")));
            verbose = bool.Parse(JenkinsConsoleUtility.GetArgVar(argsLc, "verbose", "false"));
            _getRequest = new CsGetRequest { customId = buildIdentifier };

            JcuUtil.FancyWriteToConsole(ConsoleColor.Gray, "Begin CloudScriptListener");
            var returnCode = Login(testTitleData.titleId, buildIdentifier, testTitleData);
            if (returnCode != 0)
                return returnCode;
            returnCode = WaitForTestResult(timeout, testTitleData);
            if (returnCode != 0)
                return returnCode;
            JcuUtil.FancyWriteToConsole(ConsoleColor.Gray, "Test data found");
            returnCode = FetchTestResult(workspacePath, testTitleData);
            if (returnCode != 0)
                return returnCode;
            JcuUtil.FancyWriteToConsole(ConsoleColor.Green, "Test data received");

            return 0;
        }

        private int Login(string titleId, string buildIdentifier, TestTitleData testTitleData)
        {
            PlayFabSettings.staticSettings.TitleId = titleId;
            var task = clientApi.LoginWithCustomIDAsync(new LoginWithCustomIDRequest { TitleId = titleId, CustomId = buildIdentifier, CreateAccount = true }, null, testTitleData.extraHeaders);
            task.Wait();
            var returnCode = clientApi.IsClientLoggedIn() ? 0 : 1;
            if (returnCode != 0)
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "Failed to log in using CustomID: " + titleId + ", " + buildIdentifier);
                if (task.Result.Error != null)
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, task.Result.Error.GenerateErrorReport());
                }
            }
            else
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Gray, "Login successful, TitleId:", titleId, ", PlayFabId: " + task.Result.Result.PlayFabId);
            }
            return returnCode;
        }

        /// <summary>
        /// Loop and poll for the expected test results
        /// </summary>
        private int WaitForTestResult(TimeSpan timeout, TestTitleData testTitleData)
        {
            var now = DateTime.UtcNow;
            var expireTime = now + timeout;
            var resultsReady = false;

            while (now < expireTime && !resultsReady)
            {
                string errorReport;
                var callResult = ExecuteCloudScript(CsFuncTestDataExists, _getRequest, testTitleData.extraHeaders, out resultsReady, out errorReport);
                if (callResult == false)
                    return 1; // The cloudscript call failed
                Thread.Sleep(TestDataExistsSleepTime);
                now = DateTime.UtcNow;
                JcuUtil.FancyWriteToConsole(ConsoleColor.Gray, "Test results ready: " + resultsReady);
            }

            return resultsReady ? 0 : 1;
        }

        /// <summary>
        /// Fetch the result and return
        /// (The cloudscript function should remove the test result from userData and delete the user)
        /// </summary>
        private int FetchTestResult(string workspacePath, TestTitleData testTitleData)
        {
            List<TestSuiteReport> testResults;
            string errorReport;
            var callResult = ExecuteCloudScript(CsFuncGetTestData, _getRequest, testTitleData.extraHeaders, out testResults, out errorReport);

            string outputFileFullPath = null;

            string outputFileName = "ListenCsResult.xml";
            
            outputFileFullPath = Path.Combine(workspacePath, outputFileName);

            if (!callResult || testResults == null)
                return 1;
            JcuUtil.FancyWriteToConsole(ConsoleColor.Gray, "Writing test results: " + outputFileFullPath);
            return JUnitXml.WriteXmlFile(outputFileFullPath, testResults, true);
        }

        public bool ExecuteCloudScript<TIn, TOut>(string functionName, TIn functionParameter, Dictionary<string, string> extraHeaders, out TOut result, out string errorReport)
        {
            // Perform the request
            var request = new ExecuteCloudScriptRequest
            {
                FunctionName = functionName,
                FunctionParameter = functionParameter,
                GeneratePlayStreamEvent = true
            };
            var task = clientApi.ExecuteCloudScriptAsync(request, null, extraHeaders);
            task.Wait();
            errorReport = PlayFabUtil.GetCloudScriptErrorReport(task.Result);

            if (task.Result.Error != null)
            {
                Console.WriteLine("Execute Cloudscript failure: " + functionName + ":\n" + json.SerializeObject(functionParameter));
                Console.WriteLine(errorReport);
                result = default(TOut);
                return false;
            }

            // Re-serialize as the target type
            var resultJson = json.SerializeObject(task.Result.Result.FunctionResult);
            if (verbose)
            {
                Console.WriteLine("===== Verbose ExecuteCloudScript Json: =====");
                Console.WriteLine(resultJson);
                Console.WriteLine("===== End =====");
            }
            try
            {
                result = json.DeserializeObject<TOut>(resultJson);
            }
            catch (Exception)
            {
                Console.WriteLine("Could not serialize text: \"" + resultJson + "\" as " + typeof(TOut).Name);
                result = default(TOut);
                return false;
            }
            return task.Result.Error == null && task.Result.Result.Error == null && (result != null || resultJson == "null");
        }
    }
}
