using PlayFab.UUnit;
using System;
using System.Collections.Generic;
using PlayFab;
using System.Reflection;

namespace JenkinsConsoleUtility.Commands
{
    public class TestingCommand : ICommand
    {
        public string commandKey { get { return "RunTests"; } }

        public int Execute(Dictionary<string, string> inputs)
        {
            UUnitTestSuite suite = new UUnitTestSuite(PlayFabSettings.BuildIdentifier);
            foreach (Assembly assembly in AppDomain.CurrentDomain.GetAssemblies())
                suite.FindAndAddAllTestCases(assembly, typeof(UUnitTestCase));

            suite.RunAllTests();
            UUnitTestResults result = suite.GetResults();
            Console.WriteLine(result.Summary());
            Console.WriteLine();
            return result.AllTestsPassed() ? 0 : 1;
        }
    }
}
