using PlayFab;
using PlayFab.UUnit;
using System;
using System.IO;
using Newtonsoft.Json;
using System.Collections.Generic;
using PlayFab.Internal;

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
            for (var i = 0; i < args.Length; i++)
            {
                if (args[i] == "-testInputsFile" && (i + 1) < args.Length)
                {
                    var filename = args[i + 1];
                    if (File.Exists(filename))
                    {
                        var testInputsFile = File.ReadAllText(filename);
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

            var suite = new UUnitTestSuite(PlayFabVersion.BuildIdentifier);
            // With this call, we should only expect the unittests within PlayFabSDK to run - This could be expanded by adding other assemblies manually
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
                suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));

            // Display the test results
            suite.RunAllTests();
            var results = suite.GetResults();
            Console.WriteLine(results.Summary());
            Console.WriteLine();

            return results.AllTestsPassed() ? 0 : 1;
        }
    }
}
