using System;
using System.Collections.Generic;
using System.IO;
using PlayFab.Json;
using PlayFab.UUnit;

namespace JenkinsConsoleUtility.Util
{
    public static class TestTitleDataLoader
    {
        private static TestTitleData testTitleData = null;

        public static TestTitleData Load(Dictionary<string, string> argsLc)
        {
            if (testTitleData != null)
                return testTitleData;

            string workspacePath = "";
            JenkinsConsoleUtility.TryGetArgVar(out workspacePath, argsLc, "WORKSPACE");

            string titleDataPath1 = "";
            JenkinsConsoleUtility.TryGetArgVar(out titleDataPath1, argsLc, "testTitleData");

            string titleDataPath2 = "";
            JenkinsConsoleUtility.TryGetArgVar(out titleDataPath2, argsLc, "PF_TEST_TITLE_DATA_JSON");

            // If testTitleData or PF_TEST_TITLE_DATA_JSON path is provided, save the path and try to load it
            HashSet<string> validFilepaths = new HashSet<string>();
            AddValidPath(validFilepaths, titleDataPath1, workspacePath);
            AddValidPath(validFilepaths, titleDataPath2, workspacePath);

            // Load the first file path that works
            foreach (var validFilepath in validFilepaths)
            {
                _LoadTestTitleData(validFilepath);
                if (testTitleData != null)
                    return testTitleData;
            }

            JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Could not load testTitleData.",
                ConsoleColor.Yellow, "WORKSPACE=", ConsoleColor.White, workspacePath,
                ConsoleColor.Yellow, "testTitleData=", ConsoleColor.White, titleDataPath1,
                ConsoleColor.Yellow, "PF_TEST_TITLE_DATA_JSON=", ConsoleColor.White, titleDataPath2,
                ConsoleColor.Yellow, "validFilepaths=", ConsoleColor.White, validFilepaths);

            return null;
        }

        private static void AddValidPath(HashSet<string> validFilepaths, string eachFilepath, string workspacePath)
        {
            if (string.IsNullOrEmpty(eachFilepath))
                return;
            if (!File.Exists(eachFilepath))
                eachFilepath = eachFilepath.Replace("%WORKSPACE%", workspacePath).Replace("%workspace%", workspacePath);
            if (File.Exists(eachFilepath))
                validFilepaths.Add(eachFilepath);
        }

        private static void _LoadTestTitleData(string filepath)
        {
            if (!File.Exists(filepath))
                return;

            var json = File.ReadAllText(filepath);
            try
            {
                testTitleData = JsonWrapper.DeserializeObject<TestTitleData>(json);
            }
            catch { }
        }
    }
}
