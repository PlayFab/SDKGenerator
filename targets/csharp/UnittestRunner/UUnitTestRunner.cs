using PlayFab;
using PlayFab.UUnit;
using System.Reflection;
using System;
using System.IO;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace UnittestRunner
{
    class UUnitTestRunner
    {
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
                        var serializer = JsonSerializer.Create(PlayFabSettings.JsonSettings);
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

            UUnitTestSuite suite = new UUnitTestSuite();
            // With this call, we should only expect the unittests within PlayFabSDK to run - This could be expanded by adding other assemblies manually
            foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
                suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));

            suite.RunAllTests();
            UUnitTestResult result = suite.GetResults();
            Console.WriteLine(result.Summary());
            Console.WriteLine();
            return result.AllTestsPassed() ? 0 : 1;
        }
    }
}
