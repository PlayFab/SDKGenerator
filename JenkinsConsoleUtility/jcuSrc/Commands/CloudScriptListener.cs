using PlayFab;
using PlayFab.ClientModels;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using Newtonsoft.Json;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Commands
{
    public class CsGetRequest
    {
        public string customId;
    }
    public class CsSaveRequest
    {
        public string customId;
        public TestSuiteReport[] testReport;
    }

    public class CloudScriptListener : ICommand
    {
        public string commandKey { get { return "ListenCS"; } }

        public const string CSfunc_TestDataExists = "TestDataExists";
        public const string CSfunc_GetTestData = "GetTestData";
        public const string CSfunc_SaveTestData = "SaveTestData";

        private static CsGetRequest _getRequest = null;

        public int Execute(Dictionary<string, string> args)
        {
            string titleId = GetArgVar(args, "titleId");
            string buildIdentifier = GetArgVar(args, "buildidentifier");
            string workspacePath = GetArgVar(args, "workspacePath", Environment.GetEnvironmentVariable("TEMP"));
            TimeSpan timeout = TimeSpan.FromSeconds(int.Parse(GetArgVar(args, "timeout", "30")));
            _getRequest = new CsGetRequest { customId = buildIdentifier };

            int returnCode;

            JenkinsConsoleUtility.FancyWriteToConsole("Begin CloudScriptListener", null, ConsoleColor.Gray);
            returnCode = Login(titleId, buildIdentifier);
            if (returnCode != 0)
                return returnCode;
            JenkinsConsoleUtility.FancyWriteToConsole("Login successful", null, ConsoleColor.Gray);
            returnCode = WaitForTestResult(timeout);
            if (returnCode != 0)
                return returnCode;
            JenkinsConsoleUtility.FancyWriteToConsole("Test data found", null, ConsoleColor.Gray);
            returnCode = FetchTestResult(buildIdentifier, workspacePath);
            if (returnCode != 0)
                return returnCode;
            JenkinsConsoleUtility.FancyWriteToConsole("Test data received", null, ConsoleColor.Green);

            return 0;
        }

        private static string GetArgVar(Dictionary<string, string> args, string key, string getDefault = null)
        {
            string output;
            bool found = args.TryGetValue(key.ToLower(), out output);
            if (found)
                return output;

            if (getDefault != null)
            {
                JenkinsConsoleUtility.FancyWriteToConsole("WARNING: " + key + " not found, reverting to: " + getDefault, null, ConsoleColor.DarkYellow);
                return getDefault;
            }

            string msg = "ERROR: Required parameter: " + key + " not found";
            JenkinsConsoleUtility.FancyWriteToConsole(msg, null, ConsoleColor.Red);
            throw new Exception(msg);
        }

        private static int Login(string titleId, string buildIdentifier)
        {
            PlayFabSettings.TitleId = titleId;
            var task = PlayFabClientAPI.LoginWithCustomIDAsync(new LoginWithCustomIDRequest { TitleId = titleId, CustomId = buildIdentifier, CreateAccount = true });
            task.Wait();
            return PlayFabClientAPI.IsClientLoggedIn() ? 0 : 1;
        }

        /// <summary>
        /// Loop and poll for the expected test results
        /// </summary>
        private static int WaitForTestResult(TimeSpan timeout)
        {
            DateTime now = DateTime.UtcNow;
            DateTime expireTime = now + timeout;
            bool resultsReady = false;

            while (now < expireTime && !resultsReady)
            {
                string errorReport;
                bool callResult = ExecuteCloudScript(CSfunc_TestDataExists, _getRequest, out resultsReady, out errorReport);
                if (callResult == false)
                    return 1; // The cloudscript call failed
                Thread.Sleep(1000);
                now = DateTime.UtcNow;
                JenkinsConsoleUtility.FancyWriteToConsole("Test results ready: " + resultsReady, null, ConsoleColor.Gray);
            }

            return resultsReady ? 0 : 1;
        }

        /// <summary>
        /// Fetch the result and return
        /// (The cloudscript function should remove the test result from userData and delete the user)
        /// </summary>
        private static int FetchTestResult(string buildIdentifier, string workspacePath)
        {
            List<TestSuiteReport> testResults;
            string errorReport;
            bool callResult = ExecuteCloudScript(CSfunc_GetTestData, _getRequest, out testResults, out errorReport);

            string tempFilename = buildIdentifier + ".xml";
            string tempFileFullPath = Path.Combine(workspacePath, tempFilename);

            JUnitXml.WriteXmlFile(tempFileFullPath, testResults, true);
            return callResult && testResults != null ? 0 : 1;
        }

        public static bool ExecuteCloudScript<TIn, TOut>(string functionName, TIn functionParameter, out TOut result, out string errorReport)
        {
            // Perform the request
            var request = new ExecuteCloudScriptRequest
            {
                FunctionName = functionName,
                FunctionParameter = functionParameter
            };
            var task = PlayFabClientAPI.ExecuteCloudScriptAsync(request);
            task.Wait();
            errorReport = PlayFabUtil.GetErrorReport(task.Result.Error) ?? "";

            if (task.Result.Result != null && task.Result.Result.Error != null)
                errorReport += task.Result.Result.Error.Error + task.Result.Result.Error.Message + "\n" + task.Result.Result.Error.StackTrace;

            if (task.Result.Result != null && task.Result.Result.Logs != null)
            {
                foreach (var eachLog in task.Result.Result.Logs)
                {
                    if (errorReport.Length != 0)
                        errorReport += "\n";
                    if (eachLog.Data != null)
                    {
                        // Api failure within cloudscript log
                        string json = JsonConvert.SerializeObject(eachLog.Data, Formatting.Indented);
                        errorReport += eachLog.Level + ": " + eachLog.Message + "\n" + json;
                    }
                    else
                    {
                        // Normal cloudscript log
                        errorReport += eachLog.Level + ": " + eachLog.Message;
                    }
                }
            }

            if (task.Result.Error != null)
            {
                result = default(TOut);
            }
            else
            {
                // Re-serialize as the target type
                string json = JsonConvert.SerializeObject(task.Result.Result.FunctionResult, Formatting.Indented);
                try
                {
                    result = JsonConvert.DeserializeObject<TOut>(json, PlayFabUtil.JsonSettings);
                }
                catch (Exception)
                {
                    throw new Exception("Could not serialize text: \"" + json + "\" as " + typeof(TOut).Name);
                }
            }
            return task.Result.Error == null && task.Result.Result.Error == null;
        }
    }
}
