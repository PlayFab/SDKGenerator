using JenkinsConsoleUtility.Commands;
using System;
using System.Collections.Generic;

public interface ICommand
{
    string commandKey { get; }
    int Execute(Dictionary<string, string> inputs);
}

namespace JenkinsConsoleUtility
{
    public static class JenkinsConsoleUtility
    {
        public static int Main(string[] args)
        {
            Dictionary<string, ICommand> commandLookup = FindICommands();
            List<string> orderedCommands;
            Dictionary<string, string> argsByName;
            ICommand tempCommand;

            try
            {
                ExtractArgs(args, out orderedCommands, out argsByName);

                bool success = true;
                foreach (var key in orderedCommands)
                {
                    if (!commandLookup.TryGetValue(key, out tempCommand))
                    {
                        success = false;
                        FancyWriteToConsole("Unexpected command: " + key, null, ConsoleColor.Red);
                    }
                }

                if (orderedCommands.Count == 0)
                    FancyWriteToConsole("No commands given, no work will be done", null, ConsoleColor.DarkYellow);
                if (!success || orderedCommands.Count == 0)
                    throw new Exception("Commands not input correctly");
            }
            catch (Exception)
            {
                FancyWriteToConsole("Run a sequence of ordered commands [--command --command ...] [-argKey argValue ...]\nValid commands:", commandLookup.Keys, ConsoleColor.Yellow);
                // TODO: Report valid/required args for commands
                return Pause(1);
            }

            int returnCode = 0;
            foreach (var key in orderedCommands)
            {
                if (returnCode == 0 && commandLookup.TryGetValue(key, out tempCommand))
                    returnCode = tempCommand.Execute(argsByName);
                if (returnCode != 0)
                {
                    FancyWriteToConsole(key + " command returned error code: " + returnCode, null, ConsoleColor.Yellow);
                    return Pause(returnCode);
                }
            }

            return Pause(0);
        }

        public static void FancyWriteToConsole(string msg = null, ICollection<string> multiLineMsg = null, ConsoleColor textColor = ConsoleColor.White)
        {
            Console.ForegroundColor = textColor;
            if (!string.IsNullOrEmpty(msg))
                Console.WriteLine(msg);
            if (multiLineMsg != null)
                foreach (var eachMsg in multiLineMsg)
                    Console.WriteLine(eachMsg);
            Console.ForegroundColor = ConsoleColor.White;
        }

        private static int Pause(int code)
        {
            FancyWriteToConsole("Done! Press any key to close", null, code == 0 ? ConsoleColor.Green : ConsoleColor.DarkRed);
            try
            {
                Console.ReadKey();
            }
            catch (InvalidOperationException)
            {
                // ReadKey fails when run from inside of Jenkins, so just ignore it.
            }
            return code;
        }

        public static Dictionary<string, ICommand> FindICommands()
        {
            // Just hard code the list for now
            var commandLookup = new Dictionary<string, ICommand>();
            ICommand each;

            each = new CloudScriptListener();
            commandLookup.Add(each.commandKey.ToLower(), each);

            each = new KillTaskCommand();
            commandLookup.Add(each.commandKey.ToLower(), each);

            each = new TestingCommand();
            commandLookup.Add(each.commandKey.ToLower(), each);

            return commandLookup;
        }

        /// <summary>
        /// Extract command line arguments into target information
        /// </summary>
        private static void ExtractArgs(string[] args, out List<string> orderedCommands, out Dictionary<string, string> argsByName)
        {
            orderedCommands = new List<string>();
            argsByName = new Dictionary<string, string>();

            string activeKey = null;
            foreach (string eachArgCased in args)
            {
                string eachArg = eachArgCased.ToLower();
                if (eachArg.StartsWith("--"))
                {
                    activeKey = eachArg.Substring(2);
                    orderedCommands.Add(activeKey);
                }
                else if (eachArg.StartsWith("-"))
                {
                    activeKey = eachArg.Substring(1);
                    argsByName[activeKey] = "";
                }
                else if (activeKey == null)
                {
                    throw new Exception("Unexpected token: " + eachArg);
                }
                else
                {
                    argsByName[activeKey] = argsByName[activeKey] + eachArg;
                }
            }
        }
    }
}
