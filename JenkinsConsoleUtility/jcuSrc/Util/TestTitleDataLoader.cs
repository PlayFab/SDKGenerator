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

            string eachFilepath;
            HashSet<string> validFilepaths = new HashSet<string>();
            JenkinsConsoleUtility.TryGetArgVar(out string workspacePath, argsLc, "WORKSPACE");

            // If testTitleData or PF_TEST_TITLE_DATA_JSON path is provided, save the path and try to load it
            if (JenkinsConsoleUtility.TryGetArgVar(out eachFilepath, argsLc, "testTitleData"))
                AddValidPath(validFilepaths, eachFilepath, workspacePath);
            if (JenkinsConsoleUtility.TryGetArgVar(out eachFilepath, argsLc, "PF_TEST_TITLE_DATA_JSON"))
                AddValidPath(validFilepaths, eachFilepath, workspacePath);

            // Load the first file path that works
            foreach (var validFilepath in validFilepaths)
            {
                _LoadTestTitleData(validFilepath);
                if (testTitleData != null)
                    return testTitleData;
            }

            Console.WriteLine("ERROR: Could not find a valid testTitleData");
            throw new Exception("ERROR: Could not find a valid testTitleData");
        }

        private static void AddValidPath(HashSet<string> validFilepaths, string eachFilepath, string workspacePath)
        {
            if (string.IsNullOrEmpty(eachFilepath))
                return;
            if (!File.Exists(eachFilepath))
                eachFilepath = eachFilepath.Replace("%workspace%", workspacePath);
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
