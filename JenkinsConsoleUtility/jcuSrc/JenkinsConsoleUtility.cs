using System;
using System.Collections.Generic;

public interface ICommand
{
    string[] CommandKeys { get; }
    string[] MandatoryArgKeys { get; }
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

                var success = true;
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
                FancyWriteToConsole("Run a sequence of ordered commands --<command> [--<command> ...] [-<argKey> <argValue> ...]\nValid commands:", commandLookup.Keys, ConsoleColor.Yellow);
                FancyWriteToConsole("argValues can have spaces.  Dashes in argValues can cause problems, and are not recommended.", null, ConsoleColor.Yellow);
                FancyWriteToConsole("Quotes are considered part of the argKey or argValue, and are not parsed as tokens.", null, ConsoleColor.Yellow);
                // TODO: Report valid/required args for commands
                return Pause(1);
            }

            var returnCode = 0;
            foreach (var key in orderedCommands)
            {
                // TODO: Verify MandatoryArgKeys
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

        private static Dictionary<string, ICommand> FindICommands()
        {
            // Just hard code the list for now
            var commandLookup = new Dictionary<string, ICommand>();

            var iCommands = typeof(ICommand);
            List<Type> cmdTypes = new List<Type>();
            foreach (var eachAssembly in AppDomain.CurrentDomain.GetAssemblies())
                foreach (var eachType in eachAssembly.GetTypes())
                    if (iCommands.IsAssignableFrom(eachType) && eachType.Name != iCommands.Name)
                        cmdTypes.Add(eachType);

            foreach (var eachPkgType in cmdTypes)
            {
                var eachInstance = (ICommand)Activator.CreateInstance(eachPkgType);
                foreach (var eachCmdKey in eachInstance.CommandKeys)
                    commandLookup.Add(eachCmdKey.ToLower(), eachInstance);
            }
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
            foreach (var eachArgCased in args)
            {
                var eachArg = eachArgCased.ToLower();
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
                    argsByName[activeKey] = (argsByName[activeKey] + " " + eachArg).Trim();
                }
            }
        }
    }
}
