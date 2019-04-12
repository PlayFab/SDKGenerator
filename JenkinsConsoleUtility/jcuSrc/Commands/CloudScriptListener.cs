using PlayFab;
using PlayFab.ClientModels;
using PlayFab.Json;
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

        private static CsGetRequest _getRequest;
        private static bool verbose;

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var testTitleData = TestTitleDataLoader.Load(argsLc);
            var buildIdentifier = JenkinsConsoleUtility.GetArgVar(argsLc, "buildidentifier");
            var workspacePath = JenkinsConsoleUtility.GetArgVar(argsLc, "workspacePath", Environment.GetEnvironmentVariable("TEMP"));
            var timeout = TimeSpan.FromSeconds(int.Parse(JenkinsConsoleUtility.GetArgVar(argsLc, "timeout", "30")));
            verbose = bool.Parse(JenkinsConsoleUtility.GetArgVar(argsLc, "verbose", "false"));
            _getRequest = new CsGetRequest { customId = buildIdentifier };

            // shortcut if the file already got output
            if (File.Exists(workspacePath + "\\test.xml"))
            {
                return 0;
            }

            JenkinsConsoleUtility.FancyWriteToConsole("Begin CloudScriptListener", null, ConsoleColor.Gray);
            var returnCode = Login(testTitleData.titleId, buildIdentifier, testTitleData);
            if (returnCode != 0)
                return returnCode;
            returnCode = WaitForTestResult(timeout, testTitleData);
            if (returnCode != 0)
                return returnCode;
            JenkinsConsoleUtility.FancyWriteToConsole("Test data found", null, ConsoleColor.Gray);
            returnCode = FetchTestResult(buildIdentifier, workspacePath, testTitleData);
            if (returnCode != 0)
                return returnCode;
            JenkinsConsoleUtility.FancyWriteToConsole("Test data received", null, ConsoleColor.Green);

            return 0;
        }

        private static int Login(string titleId, string buildIdentifier, TestTitleData testTitleData)
        {
            PlayFabSettings.TitleId = titleId;
            var task = PlayFabClientAPI.LoginWithCustomIDAsync(new LoginWithCustomIDRequest { TitleId = titleId, CustomId = buildIdentifier, CreateAccount = true }, null, testTitleData.extraHeaders);
            task.Wait();
            var returnCode = PlayFabClientAPI.IsClientLoggedIn() ? 0 : 1;
            if (returnCode != 0)
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Failed to log in using CustomID: " + titleId + ", " + buildIdentifier, null, ConsoleColor.Red);
                JenkinsConsoleUtility.FancyWriteToConsole(task.Result.Error?.GenerateErrorReport(), null, ConsoleColor.Red);
            }
            else
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Login successful, PlayFabId: " + task.Result.Result.PlayFabId, null, ConsoleColor.Gray);
            }
            return returnCode;
        }

        /// <summary>
        /// Loop and poll for the expected test results
        /// </summary>
        private static int WaitForTestResult(TimeSpan timeout, TestTitleData testTitleData)
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
                JenkinsConsoleUtility.FancyWriteToConsole("Test results ready: " + resultsReady, null, ConsoleColor.Gray);
            }

            return resultsReady ? 0 : 1;
        }

        /// <summary>
        /// Fetch the result and return
        /// (The cloudscript function should remove the test result from userData and delete the user)
        /// </summary>
        private static int FetchTestResult(string buildIdentifier, string workspacePath, TestTitleData testTitleData)
        {
            List<TestSuiteReport> testResults;
            string errorReport;
            var callResult = ExecuteCloudScript(CsFuncGetTestData, _getRequest, testTitleData.extraHeaders, out testResults, out errorReport);

            var tempFilename = buildIdentifier + ".xml";
            var tempFileFullPath = Path.Combine(workspacePath, tempFilename);

            if (!callResult || testResults == null)
                return 1;
            return JUnitXml.WriteXmlFile(tempFileFullPath, testResults, true);
        }

        public static bool ExecuteCloudScript<TIn, TOut>(string functionName, TIn functionParameter, Dictionary<string, string> extraHeaders, out TOut result, out string errorReport)
        {
            // Perform the request
            var request = new ExecuteCloudScriptRequest
            {
                FunctionName = functionName,
                FunctionParameter = functionParameter,
                GeneratePlayStreamEvent = true
            };
            var task = PlayFabClientAPI.ExecuteCloudScriptAsync(request, null, extraHeaders);
            task.Wait();
            errorReport = PlayFabUtil.GetCloudScriptErrorReport(task.Result);

            if (task.Result.Error != null)
            {
                Console.WriteLine("Execute Cloudscript failure: " + functionName + ":\n" + JsonWrapper.SerializeObject(functionParameter));
                Console.WriteLine(errorReport);
                result = default(TOut);
                return false;
            }

            // Re-serialize as the target type
            var json = JsonWrapper.SerializeObject(task.Result.Result.FunctionResult);
            if (verbose)
            {
                Console.WriteLine("===== Verbose ExecuteCloudScript Json: =====");
                Console.WriteLine(json);
                Console.WriteLine("===== End =====");
            }
            try
            {
                result = JsonWrapper.DeserializeObject<TOut>(json);
            }
            catch (Exception)
            {
                Console.WriteLine("Could not serialize text: \"" + json + "\" as " + typeof(TOut).Name);
                result = default(TOut);
                return false;
            }
            return task.Result.Error == null && task.Result.Result.Error == null && (result != null || json == "null");
        }
    }
}
