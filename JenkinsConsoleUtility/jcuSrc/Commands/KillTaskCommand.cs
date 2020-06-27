using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using JenkinsConsoleUtility.Util;

namespace JenkinsConsoleUtility.Commands
{
    public class KillTaskCommand : ICommand
    {
        private const int TASK_KILL_DELAY_MS = 15000;
        private const int TASK_KILL_SLEEP_MS = 500;

        private static readonly string[] MyCommandKeys = { "kill" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { "taskName" };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var taskNames = JenkinsConsoleUtility.GetArgVar(argsCased, "taskName");
            if (string.IsNullOrEmpty(taskNames))
                return 1;

            var hitList = new List<Process>();
            var taskNameList = taskNames.Split(',');
            foreach (var eachTaskName in taskNameList)
            {
                var eachTaskNameTrim = eachTaskName.Trim();
                if (string.IsNullOrEmpty(eachTaskNameTrim))
                    continue;
                var eachHitList = Process.GetProcessesByName(eachTaskNameTrim);
                hitList.AddRange(eachHitList);
                foreach (var eachProcess in eachHitList)
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Yellow, "Closing task: " + eachProcess.ProcessName);
                    eachProcess.CloseMainWindow(); // Gently close the target so they don't throw error codes 
                }
            }

            // Sleep for a while and wait for the programs to close safely
            for (var i = 0; i < TASK_KILL_DELAY_MS; i += TASK_KILL_SLEEP_MS)
            {
                Thread.Sleep(TASK_KILL_SLEEP_MS);
                var openCount = 0;
                foreach (var eachProcess in hitList)
                {
                    if (!eachProcess.HasExited)
                        openCount += 1;
                }
                if (openCount == 0)
                    break;
            }

            // Time's up, close everything
            foreach (var eachProcess in hitList)
            {
                if (eachProcess.HasExited)
                    continue; // Finished skip it
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "Killing task: " + eachProcess.ProcessName);
                eachProcess.Kill(); // If it didn't close gently, then close it better.
            }

            if (hitList.Count == 0)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "No tasks to kill: " + taskNames);
            return 0;
        }
    }
}
