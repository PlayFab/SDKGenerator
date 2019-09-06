using System;
using System.Collections.Generic;
using System.Threading;
using JenkinsConsoleUtility.Util;
using PlayFab;
using PlayFab.MultiplayerModels;
using System.Windows;

namespace JenkinsConsoleUtility.Commands
{
    public class CheckBblStandby : ICommand
    {
        private enum Severity : byte
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

        private readonly TimeSpan cycleDuration = TimeSpan.FromMinutes(0.5);
        private readonly TimeSpan cyclePeriod = TimeSpan.FromSeconds(10);
        private readonly TimeSpan retryDelay = TimeSpan.FromSeconds(10);
        private const int retryCount = 5;
        private readonly int[] GAP_THRESHOLDS = new[] { 10000, 10000, 1000, 400, 200, 100 };
        private readonly int[] MAX_PERCENT_THRESHOLDS = new[] { 1000, 1000, 100, 95, 80, 75 };
        private readonly int[] STANDBY_THRESHOLDS = new[] { -1, -1, 0, 6, 9, 11 };

        private DateTime endOfCycle;
        private string bblVersions;
        Severity worstBblSeverity = Severity.NONE;
        Severity worstThSeverity = Severity.NONE;

        public CheckBblStandby()
        {
            context = new PlayFabAuthenticationContext();
            settings = new PlayFabApiSettings();
            authApi = new PlayFabAuthenticationInstanceAPI(settings, context);
            multiplayerApi = new PlayFabMultiplayerInstanceAPI(settings, context);
        }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            bblVersions = JenkinsConsoleUtility.GetArgVar(argsLc, "BBL_VERSIONS");

            var setupCode = LoginToPlayfab(argsLc);
            if (setupCode != 0)
                return setupCode;

            var cumulativeResult = new Tuple<int, Severity>(0, Severity.SEV_0);

            endOfCycle = DateTime.UtcNow + cycleDuration;
            while (endOfCycle > DateTime.UtcNow)
            {
                var eachSummary = GetBuildSummaryFromPlayfab();
                var eachResult = EvaluateBuildSummaries(bblVersions, eachSummary);

                // Combine the results
                cumulativeResult = new Tuple<int, Severity>(
                    cumulativeResult.Item1 + eachResult.Item1,
                    (Severity)Math.Max((byte)cumulativeResult.Item2, (byte)eachResult.Item2) // Least Error Seen
                );

                Thread.Sleep((int)cyclePeriod.TotalMilliseconds);
            }

            JcuUtil.FancyWriteToConsole("Finished Query Cycle");
            MakeAlert(null, worstBblSeverity, " <- Worst Bumblelion Error Level");
            MakeAlert(null, worstThSeverity, " <- Worst Thunderhead Error Level");
            MakeAlert(null, cumulativeResult.Item2, " <- Typical Error Level. Total Number of Alerts: " + cumulativeResult.Item1);

            return (cumulativeResult.Item2 <= Severity.SEV_3) ? cumulativeResult.Item1 : 0;
        }

        private int LoginToPlayfab(Dictionary<string, string> argsLc)
        {
            // Get Login Credentials
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

            // Perform PlayFab Login
            for (int i = 0; i < retryCount; i++)
            {
                var tokenTask = authApi.GetEntityTokenAsync(null);
                tokenTask.Wait();

                if (string.IsNullOrEmpty(context.EntityToken))
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: CheckBblStandby was not able to authenticate as expected, sleeping...");
                    Thread.Sleep((int)retryDelay.TotalMilliseconds);
                }
                else
                {
                    break;
                }
            }

            if (string.IsNullOrEmpty(context.EntityToken))
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: CheckBblStandby was not able to authenticate as expected. Failing out.");
                return 1;
            }

            return 0;
        }

        private List<BuildSummary> GetBuildSummaryFromPlayfab()
        {
            var listBuildsRequest = new ListBuildSummariesRequest { PageSize = 100 };

            for (int i = 0; i < retryCount; i++)
            {
                var listBuildsTask = multiplayerApi.ListBuildSummariesAsync(listBuildsRequest);
                listBuildsTask.Wait();
                var buildSummaries = listBuildsTask?.Result?.Result?.BuildSummaries;
                if (buildSummaries == null)
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Was unable to list build summaries, sleeping...");
                    Thread.Sleep((int)retryDelay.TotalMilliseconds);
                }
                else
                {
                    return buildSummaries;
                }
            }

            JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Was unable to list build summaries, failing out...");
            return null;
        }

        private Tuple<int, Severity> EvaluateBuildSummaries(string bblVersions, List<BuildSummary> buildSummaries)
        {
            List<string> bblAlerts = new List<string>();
            List<string> thAlerts = new List<string>();
            HashSet<string> completedVersions = new HashSet<string>();

            Severity worstTickSeverity = Severity.NONE;
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
                    JcuUtil.FancyWriteToConsole("    - " + each.Region + ", (sby:" + each.StandbyServers + "/max:" + each.MaxServers + ")(sby:" + each.CurrentServerStats.StandingBy + "/prp:" + each.CurrentServerStats.Propping + "/act:" + each.CurrentServerStats.Active + "/max:" + each.MaxServers + ")");

                    if (each.CurrentServerStats.StandingBy == 0 && each.CurrentServerStats.Active == 0 && each.CurrentServerStats.Propping == 0)
                    {
                        MakeAlert(thAlerts, Severity.SEV_4, "Bad region numbers detected");
                        worstThSeverity = (Severity)Math.Min((byte)worstThSeverity, (byte)Severity.SEV_4);
                        // worstTickSeverity = (Severity)Math.Min((byte)worstTickSeverity, (byte)Severity.SEV_4); // Thunderhead errors won't count against the tick for now
                        continue; // All hell will break loose below, with these numbers, but they're not legit, so skip it
                    }

                    var gap = each.StandbyServers - each.CurrentServerStats.StandingBy - each.CurrentServerStats.Propping;
                    for (var i = 0; i < GAP_THRESHOLDS.Length; i++)
                    {
                        if (gap >= GAP_THRESHOLDS[i])
                        {
                            MakeAlert(thAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - High \"StandBy + Propping\" Gap (" + gap + ") in region:" + each.Region);
                            worstThSeverity = (Severity)Math.Min((byte)worstThSeverity, i);
                            // worstTickSeverity = (Severity)Math.Min((byte)worstTickSeverity, i); // Thunderhead errors won't count against the tick for now
                            break;
                        }
                    }

                    for (var i = 0; i < MAX_PERCENT_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.Active >= (each.MaxServers * MAX_PERCENT_THRESHOLDS[i] / 100))
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - " + MAX_PERCENT_THRESHOLDS[i] + "% (" + each.CurrentServerStats.Active + "/" + each.MaxServers + ") Max Servers reached in region:" + each.Region);
                            worstBblSeverity = (Severity)Math.Min((byte)worstBblSeverity, i);
                            worstTickSeverity = (Severity)Math.Min((byte)worstTickSeverity, i);
                            break;
                        }
                    }

                    for (var i = 0; i < STANDBY_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.StandingBy <= STANDBY_THRESHOLDS[i])
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - Low Standby in region:" + each.Region + ", " + each.CurrentServerStats.StandingBy + "<=" + STANDBY_THRESHOLDS[i]);
                            worstBblSeverity = (Severity)Math.Min((byte)worstBblSeverity, i);
                            worstTickSeverity = (Severity)Math.Min((byte)worstTickSeverity, i);
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

            return new Tuple<int, Severity>(bblAlerts.Count + thAlerts.Count, worstTickSeverity);
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
            if (severity <= Severity.SEV_4 && alertList != null)
                alertList.Add(msg);
        }
    }
}
