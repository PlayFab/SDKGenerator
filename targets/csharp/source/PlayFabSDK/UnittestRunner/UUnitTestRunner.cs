using PlayFab;
using PlayFab.ClientModels;
using PlayFab.UUnit;
using System;
using System.IO;
using System.Threading.Tasks;

#pragma warning disable 0649, 0414
namespace UnittestRunner
{
    static class UUnitTestRunner
    {
        private const int MAX_TEST_DURATION_MS = 120000;

        public class CsSaveRequest
        {
            public string customId;
            public TestSuiteReport[] testReport;
        }

        public static int Main(string[] args)
        {
            int result = 1;
            bool taskFinished = false;
            try
            {
                var mainTask = MainTask(args);
                taskFinished = mainTask.Wait(MAX_TEST_DURATION_MS);
                result = mainTask.Result; // Deliberately try to invoke a mainthread deadlock, but SynchronizationContextRemover should prevent it
            }
            catch (Exception e)
            {
                WriteConsoleColor(e.ToString(), ConsoleColor.Red);
            }
            return Pause(taskFinished ? result : 1);
        }

        public static async Task<int> MainTask(string[] args)
        {
            var testInputs = GetTestTitleData(args);
            UUnitIncrementalTestRunner.Start(true, null, testInputs, OnComplete);
            while (!UUnitIncrementalTestRunner.SuiteFinished)
                await UUnitIncrementalTestRunner.Tick();

            WriteConsoleColor(UUnitIncrementalTestRunner.Summary);

            return UUnitIncrementalTestRunner.AllTestsPassed ? 0 : 1;
        }

        private static void WriteConsoleColor(string msg = null, ConsoleColor textColor = ConsoleColor.White)
        {
            Console.ForegroundColor = textColor;
            if (!string.IsNullOrEmpty(msg))
                Console.WriteLine(msg);
            Console.ForegroundColor = ConsoleColor.White;
        }

        private static int Pause(int code)
        {
            WriteConsoleColor("Done! Press any key to close", code == 0 ? ConsoleColor.Green : ConsoleColor.Red);
            try
            {
                Console.ReadKey();
            }
            catch (InvalidOperationException)
            {
                // ReadKey fails when run from inside of Jenkins, so just ignore it.
            }
            return code;
        }

        private static TestTitleData GetTestTitleData(string[] args)
        {
            TestTitleData testInputs = null;
            string filename = null;
            for (var i = 0; i < args.Length; i++)
                if (args[i] == "-testInputsFile" && (i + 1) < args.Length)
                    filename = args[i + 1];
            if (string.IsNullOrEmpty(filename))
                filename = Environment.GetEnvironmentVariable("PF_TEST_TITLE_DATA_JSON");
            if (File.Exists(filename))
            {
                var testInputsFile = File.ReadAllText(filename);
                testInputs = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject<TestTitleData>(testInputsFile);
            }
            else
            {
                WriteConsoleColor("Loading testSettings file failed: " + filename, ConsoleColor.Red);
                WriteConsoleColor("From: " + Directory.GetCurrentDirectory(), ConsoleColor.Red);
            }
            return testInputs;
        }

        private static void OnComplete(PlayFabResult<ExecuteCloudScriptResult> result)
        {
            WriteConsoleColor("Save to CloudScript result for: " + PlayFabSettings.BuildIdentifier + " => " + UUnitIncrementalTestRunner.PfClient.authenticationContext.PlayFabId, ConsoleColor.Gray);
            if (result.Error != null)
                WriteConsoleColor(result.Error.GenerateErrorReport(), ConsoleColor.Red);
            else if (result.Result != null)
                WriteConsoleColor("Successful!", ConsoleColor.Green);
        }
    }
}
#pragma warning restore 0649, 0414
