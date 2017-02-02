using PlayFab;
using PlayFab.UUnit;
using System;
using System.IO;
using Newtonsoft.Json;
using System.Collections.Generic;
using PlayFab.Internal;

namespace UnittestRunner
{
    public class TestTitleData
    {
        public string titleId;
        public string developerSecretKey;
        public string userEmail;
        public string characterName;
        public Dictionary<string, string> extraHeaders;
    }

    static class UUnitTestRunner
    {
        public class CsSaveRequest
        {
            public string customId;
            public TestSuiteReport[] testReport;
        }

        static int Main(string[] args)
        {
            var testInputs = GetTestTitleData(args);
            PlayFabApiTest.SetTitleInfo(testInputs);
            var suite = new UUnitTestSuite(PlayFabVersion.BuildIdentifier);
            AddAllTestClasses(suite);

            // Display the test results
            suite.RunAllTests();
            var results = suite.GetResults();
            Console.WriteLine(results.Summary());
            Console.WriteLine();

            return results.AllTestsPassed() ? 0 : 1;
        }

        private static void AddAllTestClasses(UUnitTestSuite suite)
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
                suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));
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
                var serializer = JsonSerializer.Create(PlayFabUtil.JsonSettings);
                testInputs = serializer.Deserialize<TestTitleData>(new JsonTextReader(new StringReader(testInputsFile)));
            }
            else
            {
                Console.WriteLine("Loading testSettings file failed: " + filename);
                Console.WriteLine("From: " + Directory.GetCurrentDirectory());
            }
            return testInputs;
        }
    }
}
