using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace JenkinsConsoleUtility.Commands
{
    class KillTaskCommand : ICommand
    {
        public string commandKey => "kill";

        public int Execute(Dictionary<string, string> inputs)
        {
            string taskName;
            if (!inputs.TryGetValue("taskname", out taskName))
                return 1;

            var processes = Process.GetProcessesByName(taskName);
            foreach (var process in processes)
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Killing task: " + process.ProcessName, null, ConsoleColor.Magenta);
                process.Kill();
            }

            return processes.Length > 0 ? 0 : 1;
        }
    }
}
