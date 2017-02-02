using PlayFab;
using PlayFab.UUnit;
using System;
using System.IO;
using System.Collections.Generic;
using System.Threading;
using PlayFab.ClientModels;
using PlayFab.Json;

namespace UnittestRunner
{
    static class UUnitTestRunner
    {
        private static bool _onCompleted = false;
        public class CsSaveRequest
        {
            public string customId;
            public TestSuiteReport[] testReport;
        }

        private static int Main(string[] args)
        {
            var testInputs = GetTestTitleData(args);
            UUnitIncrementalTestRunner.Start(true, null, testInputs, OnComplete);
            while (!UUnitIncrementalTestRunner.SuiteFinished)
                UUnitIncrementalTestRunner.Tick();

            Console.WriteLine(UUnitIncrementalTestRunner.Summary);
            Console.WriteLine();

            // Wait for OnComplete
            var timeout = DateTime.UtcNow + TimeSpan.FromSeconds(30);
            while (!_onCompleted && DateTime.UtcNow < timeout)
                Thread.Sleep(100);

            return UUnitIncrementalTestRunner.AllTestsPassed ? 0 : 1;
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
                testInputs = JsonWrapper.DeserializeObject<TestTitleData>(testInputsFile);
            }
            else
            {
                Console.WriteLine("Loading testSettings file failed: " + filename);
                Console.WriteLine("From: " + Directory.GetCurrentDirectory());
            }
            return testInputs;
        }

        private static void OnComplete(PlayFabResult<ExecuteCloudScriptResult> result)
        {
            Console.WriteLine("Save to CloudScript result for: " + PlayFabSettings.BuildIdentifier + " => " + PlayFabApiTest.PlayFabId);
            if (result.Error != null)
            {
                Console.WriteLine(result.Error.GenerateErrorReport());
            }
            else if (result.Result != null)
            {
                Console.WriteLine("Successful!");
            }
            _onCompleted = true;
        }
    }
}
