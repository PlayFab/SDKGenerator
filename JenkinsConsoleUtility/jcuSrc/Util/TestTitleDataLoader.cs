using PlayFab.Json;
using PlayFab.UUnit;
using System;
using System.Collections.Generic;
using System.IO;

namespace JenkinsConsoleUtility.Util
{
    public static class TestTitleDataLoader
    {
        private static TestTitleData testTitleData = null;

        public static TestTitleData Load(Dictionary<string, string> argsLc)
        {
            if (testTitleData != null)
                return testTitleData;

            string filepath;
            // If testTitleData path is provided, try to load the file
            if (JenkinsConsoleUtility.TryGetArgVar(out filepath, argsLc, "testTitleData") && !string.IsNullOrEmpty(filepath))
                _LoadTestTitleData(filepath);
            // If PF_TEST_TITLE_DATA_JSON exists, get testTitleData path from it, and try to load the file
            filepath = Environment.GetEnvironmentVariable("PF_TEST_TITLE_DATA_JSON");
            if (!string.IsNullOrEmpty(filepath))
                _LoadTestTitleData(filepath);

            if (testTitleData == null)
            {
                Console.WriteLine("ERROR: Must use testTitleData");
                throw new Exception("ERROR: Must use testTitleData");
            }

            return testTitleData;
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
