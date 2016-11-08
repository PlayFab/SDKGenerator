using PlayFab.UUnit;
using System;
using System.Collections.Generic;

namespace JenkinsConsoleUtility.Commands
{
    public class TestingCommand : ICommand
    {
        private static readonly string[] MyCommandKeys = { "RunTests" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

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
