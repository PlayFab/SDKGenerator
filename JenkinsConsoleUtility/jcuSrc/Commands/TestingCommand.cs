using PlayFab.UUnit;
using System;
using System.Collections.Generic;
using JenkinsConsoleUtility.Util;
using JenkinsConsoleUtility.Testing;

namespace JenkinsConsoleUtility.Commands
{
    public class TestingCommand : ICommand
    {
        private static readonly string[] MyCommandKeys = { "Test", "RunTests" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var testTitleData = TestTitleDataLoader.Load(null);
            UUnitIncrementalTestRunner.Start(false, null, testTitleData, null);
            UUnitIncrementalTestRunner.AddTestAssembly(typeof(CloudScriptTests).Assembly);

            while (!UUnitIncrementalTestRunner.SuiteFinished)
                UUnitIncrementalTestRunner.Tick();

            var summaryLines = UUnitIncrementalTestRunner.Summary.Split('\n');
            foreach (var eachLine in summaryLines)
            {
                ConsoleColor color = eachLine.Contains("FAILED") ? ConsoleColor.Red : eachLine.Contains("PASSED") ? ConsoleColor.White : ConsoleColor.Yellow;
                JcuUtil.FancyWriteToConsole(color, eachLine);
            }
            Console.WriteLine();
            return UUnitIncrementalTestRunner.AllTestsPassed ? 0 : 1;
        }
    }
}
