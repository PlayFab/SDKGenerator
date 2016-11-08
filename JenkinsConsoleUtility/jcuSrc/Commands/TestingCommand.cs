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
            UUnitIncrementalTestRunner.Start(false, null, null, null);
            while (!UUnitIncrementalTestRunner.SuiteFinished)
                UUnitIncrementalTestRunner.Tick();

            Console.WriteLine(UUnitIncrementalTestRunner.Summary);
            Console.WriteLine();
            return UUnitIncrementalTestRunner.AllTestsPassed ? 0 : 1;
        }
    }
}
