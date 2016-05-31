using PlayFab.UUnit;
using System;
using System.Collections.Generic;

namespace JenkinsConsoleUtility.Commands
{
    public class TestingCommand : ICommand
    {
        public string commandKey { get { return "RunTests"; } }

        public int Execute(Dictionary<string, string> inputs)
        {
            UUnitTestSuite suite = new UUnitTestSuite();
            suite.FindAndAddAllTestCases(typeof(UUnitTestCase));

            suite.RunAllTests();
            UUnitTestResult result = suite.GetResults();
            Console.WriteLine(result.Summary());
            Console.WriteLine();
            return result.AllTestsPassed() ? 0 : 1;
        }
    }
}
