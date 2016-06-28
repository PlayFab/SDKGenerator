using PlayFab;
using PlayFab.UUnit;
using System.Reflection;
using System;
using System.IO;
using Newtonsoft.Json;
using System.Collections.Generic;
using PlayFab.ClientModels;

namespace UnittestRunner
{
    static class UUnitTestRunner
    {
        public class CsSaveRequest
        {
            public string customId;
            public TestSuiteReport[] testReport;
        }

        static int Main(string[] args)
        {
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "-testInputsFile" && (i + 1) < args.Length)
                {
                    string filename = args[i + 1];
                    if (File.Exists(filename))
                    {
                        string testInputsFile = File.ReadAllText(filename);
                        var serializer = JsonSerializer.Create(PlayFabUtil.JsonSettings);
                        var testInputs = serializer.Deserialize<Dictionary<string, string>>(new JsonTextReader(new StringReader(testInputsFile)));
                        PlayFabApiTest.SetTitleInfo(testInputs);
                    }
                    else
                    {
                        Console.WriteLine("Loading testSettings file failed: " + filename);
                        Console.WriteLine("From: " + Directory.GetCurrentDirectory());
                    }
                }
            }

            UUnitTestSuite suite = new UUnitTestSuite(PlayFab.PlayFabSettings.BuildIdentifier);
            // With this call, we should only expect the unittests within PlayFabSDK to run - This could be expanded by adding other assemblies manually
            foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
                suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));

            // Display the test results
            suite.RunAllTests();
            UUnitTestResults results = suite.GetResults();
            Console.WriteLine(results.Summary());
            Console.WriteLine();

            // Submit the test results to CloudScript
            ExecuteCloudScriptRequest request = new ExecuteCloudScriptRequest
            {
                FunctionName = "SaveTestData",
                FunctionParameter = new CsSaveRequest { customId = PlayFabSettings.BuildIdentifier, testReport = new[] { results.InternalReport } },
                GeneratePlayStreamEvent = true
            };

            var task = PlayFabClientAPI.ExecuteCloudScriptAsync(request);
            task.Wait();
            if (task.Result.Error != null || task.Result.Result.Error != null)
                Console.WriteLine("Error posting results to cloudscript:" + PlayFabUtil.GetCloudScriptErrorReport(task.Result));
            else
                Console.WriteLine("Results posted to cloudscript successfully: " + PlayFabSettings.BuildIdentifier);
            Console.WriteLine("Debugging: " + PlayFabUtil.GetCloudScriptErrorReport(task.Result));

            return results.AllTestsPassed() ? 0 : 1;
        }
    }
}
