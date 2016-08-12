using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;

namespace JenkinsConsoleUtility.Commands
{
    class KillTaskCommand : ICommand
    {
        private const int TASK_KILL_DELAY_MS = 15000;
        private const int TASK_KILL_SLEEP_MS = 500;

        public string commandKey { get { return "kill"; } }

        public int Execute(Dictionary<string, string> inputs)
        {
            string taskName;
            if (!inputs.TryGetValue("taskname", out taskName))
                return 1;

            List<Process> hitList = new List<Process>();
            hitList.AddRange(Process.GetProcessesByName(taskName));
            foreach (var eachProcess in hitList)
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Closing task: " + eachProcess.ProcessName, null, ConsoleColor.Yellow);
                eachProcess.CloseMainWindow(); // Gently close the target so they don't throw error codes 
            }

            // Sleep for a while and wait for the programs to close safely
            int openCount = hitList.Count;
            for (int i = 0; i < TASK_KILL_DELAY_MS; i += TASK_KILL_SLEEP_MS)
            {
                Thread.Sleep(TASK_KILL_SLEEP_MS);
                openCount = 0;
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
                JenkinsConsoleUtility.FancyWriteToConsole("Killing task: " + eachProcess.ProcessName, null, ConsoleColor.Red);
                eachProcess.Kill(); // If it didn't close gently, then close it better.
            }

            return hitList.Count > 0 ? 0 : 1;
        }
    }
}
