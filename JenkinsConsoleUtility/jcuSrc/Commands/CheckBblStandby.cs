using System;
using System.Collections.Generic;
using JenkinsConsoleUtility.Util;
using PlayFab;
using PlayFab.MultiplayerModels;

namespace JenkinsConsoleUtility.Commands
{
    public class CheckBblStandby : ICommand
    {
        private enum Severity
        {
            SEV_0, // Wake up everyone
            SEV_1, // Wake up team
            SEV_2, // Wake up on-call
            SEV_3, // Send an email
            SEV_4, // File a bug
            SEV_5, // Follow up if there's lots of them

            NONE, // No issue
        }

        private static readonly string[] MyCommandKeys = { "CheckBbl", "BblStandby" };
        public string[] CommandKeys => MyCommandKeys;
        private static readonly string[] MyMandatoryArgKeys = { "BBL_VERSIONS" };
        public string[] MandatoryArgKeys => MyMandatoryArgKeys;

        private PlayFabAuthenticationContext context;
        private PlayFabApiSettings settings;
        private PlayFabAuthenticationInstanceAPI authApi;
        private PlayFabMultiplayerInstanceAPI multiplayerApi;

        private readonly int[] GAP_THRESHOLDS = new[] { 10000, 10000, 1000, 400, 200, 100 };
        private readonly int[] MAX_PERCENT_THRESHOLDS = new[] { 1000, 1000, 100, 95, 80, 75 };
        private readonly int[] STANDBY_THRESHOLDS = new[] { -1, -1, 0, 6, 9, 11 };

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

            var buildResults = EvaluateBuildSummaries(bblVersions, buildSummaries);

            return (buildResults.Item2 <= Severity.SEV_3) ? buildResults.Item1 : 0;
        }

        private Tuple<int, Severity> EvaluateBuildSummaries(string bblVersions, List<BuildSummary> buildSummaries)
        {
            List<string> bblAlerts = new List<string>();
            List<string> thAlerts = new List<string>();
            HashSet<string> completedVersions = new HashSet<string>();

            Severity worstSeverity = Severity.NONE;
            foreach (var eachSummary in buildSummaries)
            {
                if (!eachSummary.Metadata.TryGetValue("Version", out string versionString))
                    continue;
                if (!bblVersions.Contains(versionString) || completedVersions.Contains(versionString))
                    continue;

                bool isDeployed = true;
                foreach (var eachRegionConfig in eachSummary.RegionConfigurations)
                    isDeployed &= eachRegionConfig.Status == "Deployed";
                if (!isDeployed || eachSummary.RegionConfigurations.Count == 0)
                    continue;

                JcuUtil.FancyWriteToConsole("Found Version: " + versionString + ",  BuildId: " + eachSummary.BuildId);
                foreach (var each in eachSummary.RegionConfigurations)
                {
                    JcuUtil.FancyWriteToConsole(" - " + each.Region + ", (sby:" + each.StandbyServers + "/max:" + each.MaxServers + ")(sby:" + each.CurrentServerStats.StandingBy + "/prp:" + each.CurrentServerStats.Propping + "/act:" + each.CurrentServerStats.Active + "/max:" + each.MaxServers + ")");

                    if (each.CurrentServerStats.StandingBy == 0 && each.CurrentServerStats.Active == 0 && each.CurrentServerStats.Propping == 0)
                    {
                        MakeAlert(thAlerts, Severity.SEV_4, "Bad region numbers detected");
                        worstSeverity = Severity.SEV_4;
                        continue; // All hell will break loose below, with these numbers, but they're not legit, so skip it
                    }

                    var gap = each.StandbyServers - each.CurrentServerStats.StandingBy - each.CurrentServerStats.Propping;
                    for (var i = 0; i < GAP_THRESHOLDS.Length; i++)
                    {
                        if (gap >= GAP_THRESHOLDS[i])
                        {
                            MakeAlert(thAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - High (StandBy + Propping) Gap in region:" + gap);
                            worstSeverity = (Severity)i;
                            break;
                        }
                    }

                    for (var i = 0; i < MAX_PERCENT_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.Active >= (each.MaxServers * MAX_PERCENT_THRESHOLDS[i] / 100))
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - " + MAX_PERCENT_THRESHOLDS[i] + "% (" + each.CurrentServerStats.Active + "/" + each.MaxServers + ") Max Servers reached in region:" + each.Region);
                            worstSeverity = (Severity)i;
                            break;
                        }
                    }

                    for (var i = 0; i < STANDBY_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.StandingBy <= STANDBY_THRESHOLDS[i])
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - Low Standby in region:" + each.Region + ", " + each.CurrentServerStats.StandingBy + "<=" + STANDBY_THRESHOLDS[i]);
                            worstSeverity = (Severity)i;
                            break;
                        }
                    }
                }

                JcuUtil.FancyWriteToConsole(null);
                completedVersions.Add(versionString);
            }

            if (bblAlerts.Count > 0)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Yellow, "Bumblelion alert list:", ConsoleColor.Red, null, bblAlerts, null);
            if (thAlerts.Count > 0)
                JcuUtil.FancyWriteToConsole(ConsoleColor.Yellow, "Thunderhead alert list:", ConsoleColor.Blue, null, thAlerts, null);

            return new Tuple<int, Severity>(bblAlerts.Count + thAlerts.Count, worstSeverity);
        }

        private void MakeAlert(List<string> alertList, Severity severity, string msg)
        {
            ConsoleColor alertColor;
            switch (severity)
            {
                case Severity.SEV_0: alertColor = ConsoleColor.Magenta; break;
                case Severity.SEV_1: alertColor = ConsoleColor.Magenta; break;
                case Severity.SEV_2: alertColor = ConsoleColor.Red; break;
                case Severity.SEV_3: alertColor = ConsoleColor.Yellow; break;
                case Severity.SEV_4: alertColor = ConsoleColor.Yellow; break;
                case Severity.SEV_5: alertColor = ConsoleColor.DarkGray; break;
                default: alertColor = ConsoleColor.White; break;
            }
            JcuUtil.FancyWriteToConsole(alertColor, severity + " " + msg);
            if (severity <= Severity.SEV_4)
                alertList.Add(msg);
        }
    }
}
