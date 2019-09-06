using System;
using System.Collections.Generic;
using JenkinsConsoleUtility.Util;
using PlayFab;
using PlayFab.MultiplayerModels;

namespace JenkinsConsoleUtility.Commands
{
    public class CheckBblStandby : ICommand
    {
        private static readonly string[] MyCommandKeys = { "CheckBbl", "BblStandby" };
        public string[] CommandKeys => MyCommandKeys;
        private static readonly string[] MyMandatoryArgKeys = { "BBL_VERSIONS" };
        public string[] MandatoryArgKeys => MyMandatoryArgKeys;

        private PlayFabAuthenticationContext context;
        private PlayFabApiSettings settings;
        private PlayFabAuthenticationInstanceAPI authApi;
        private PlayFabMultiplayerInstanceAPI multiplayerApi;

        private const int S2_MAX_THRESHHOLD_PERCENT = 90;
        private const int S3_MAX_THRESHHOLD_PERCENT = 75;

        private const int S1_LOW_STANDBY_THRESHHOLD = 3;
        private const int S2_LOW_STANDBY_THRESHHOLD = 11;

        public CheckBblStandby()
        {
            context = new PlayFabAuthenticationContext();
            settings = new PlayFabApiSettings();
            authApi = new PlayFabAuthenticationInstanceAPI(settings, context);
            multiplayerApi = new PlayFabMultiplayerInstanceAPI(settings, context);
        }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            string bblVersions = JenkinsConsoleUtility.GetArgVar(argsLc, "BBL_VERSIONS");

            var testTitleData = TestTitleDataLoader.Load(argsLc);
            if (testTitleData == null)
            {
                JenkinsConsoleUtility.TryGetArgVar(out string workspacePath, argsLc, "WORKSPACE");
                JenkinsConsoleUtility.TryGetArgVar(out string titleDataPath1, argsLc, "testTitleData");
                JenkinsConsoleUtility.TryGetArgVar(out string titleDataPath2, argsLc, "PF_TEST_TITLE_DATA_JSON");

                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Could not load testTitleData.",
                    ConsoleColor.Yellow, "WORKSPACE=", ConsoleColor.White, workspacePath,
                    ConsoleColor.Yellow, "testTitleData=", ConsoleColor.White, titleDataPath1,
                    ConsoleColor.Yellow, "PF_TEST_TITLE_DATA_JSON=", ConsoleColor.White, titleDataPath2);
                return 1;
            }

            settings.TitleId = testTitleData.titleId;
            settings.DeveloperSecretKey = testTitleData.developerSecretKey;

            var tokenTask = authApi.GetEntityTokenAsync(null);
            tokenTask.Wait();
            if (string.IsNullOrEmpty(context.EntityToken))
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: CheckBblStandby was not able to authenticate as expected.");
                return 1;
            }

            var listBuildsRequest = new ListBuildSummariesRequest { PageSize = 100 };
            var listBuildsTask = multiplayerApi.ListBuildSummariesAsync(listBuildsRequest);
            listBuildsTask.Wait();
            var buildSummaries = listBuildsTask?.Result?.Result?.BuildSummaries;
            if (buildSummaries == null)
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Was unable to list build summaries.");
                return 1;
            }

            List<string> alerts = new List<string>();
            HashSet<string> completedVersions = new HashSet<string>();
            foreach (var eachSummary in buildSummaries)
            {
                if (!eachSummary.Metadata.TryGetValue("Version", out string versionString))
                    continue;
                if (!bblVersions.Contains(versionString) || completedVersions.Contains(versionString))
                    continue;

                bool isDeployed = true;
                foreach (var eachRegionConfig in eachSummary.RegionConfigurations)
                    isDeployed &= eachRegionConfig.Status == "Deployed";
                if (!isDeployed)
                    continue;

                Action<string> makeAlert = (msg) =>
                {
                    ConsoleColor alertColor;
                    switch (msg.Substring(0, 4))
                    {
                        case "SEV1": alertColor = ConsoleColor.Magenta; break;
                        case "SEV2": alertColor = ConsoleColor.Red; break;
                        case "SEV3": alertColor = ConsoleColor.Yellow; break;
                        default: alertColor = ConsoleColor.White; break;
                    }
                    JcuUtil.FancyWriteToConsole(alertColor, msg);
                    alerts.Add(msg);
                };

                JcuUtil.FancyWriteToConsole("Found Version: " + versionString + ",  BuildId: " + eachSummary.BuildId);
                foreach (var each in eachSummary.RegionConfigurations)
                {
                    JcuUtil.FancyWriteToConsole(" - " + each.Region + ", (sby:" + each.CurrentServerStats.StandingBy + "/prp:" + each.CurrentServerStats.Propping + "/act:" + each.CurrentServerStats.Active + "/max:" + each.MaxServers + ")");

                    if (each.CurrentServerStats.Active >= each.MaxServers)
                        makeAlert("SEV1: " + versionString + ", " + eachSummary.BuildId + " - Max Servers reached in region:" + each.Region);
                    else if (each.CurrentServerStats.Active >= (each.MaxServers * S2_MAX_THRESHHOLD_PERCENT / 100))
                        makeAlert("SEV2: " + versionString + ", " + eachSummary.BuildId + " - " + S2_MAX_THRESHHOLD_PERCENT + "% (" + each.CurrentServerStats.Active + "/" + each.MaxServers + ") Max Servers reached in region:" + each.Region);
                    else if (each.CurrentServerStats.Active >= (each.MaxServers * S3_MAX_THRESHHOLD_PERCENT / 100))
                        makeAlert("SEV3: " + versionString + ", " + eachSummary.BuildId + " - " + S3_MAX_THRESHHOLD_PERCENT + "% (" + each.CurrentServerStats.Active + "/" + each.MaxServers + ") Max Servers reached in region:" + each.Region);

                    if (each.CurrentServerStats.StandingBy <= S1_LOW_STANDBY_THRESHHOLD)
                        makeAlert("SEV1: " + versionString + ", " + eachSummary.BuildId + " - Standby == 0 for region:" + each.Region + ", " + each.CurrentServerStats.StandingBy + "<=" + S1_LOW_STANDBY_THRESHHOLD);
                    else if (each.CurrentServerStats.StandingBy <= S2_LOW_STANDBY_THRESHHOLD)
                        makeAlert("SEV2: " + versionString + ", " + eachSummary.BuildId + " - Low Standby in region:" + each.Region + ", " + each.CurrentServerStats.StandingBy + "<=" + S2_LOW_STANDBY_THRESHHOLD);
                }

                JcuUtil.FancyWriteToConsole(null);
                completedVersions.Add(versionString);
            }

            if (alerts.Count > 0)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Yellow, "Alert list:", ConsoleColor.Red, null, alerts, null);

            return alerts.Count;
        }
    }
}
