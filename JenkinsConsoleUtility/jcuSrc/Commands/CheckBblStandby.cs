using System;
using System.Collections.Generic;
using System.Threading;
using JenkinsConsoleUtility.Util;
using PlayFab;
using PlayFab.MultiplayerModels;
using System.Linq;

namespace JenkinsConsoleUtility.Commands
{
    public class CheckBblStandby : ICommand
    {
        private enum Severity : byte
        {
            SEV_0, // Wake up everyone
            SEV_1, // Wake up team
            SEV_2, // Wake up on-call
            SEV_3, // Send an email for morning
            SEV_4, // File a bug for next sprint
            SEV_5, // Follow up someday if I feel like it

            NONE, // No issue
        }

        private static readonly string[] MyCommandKeys = { "CheckBbl", "BblStandby" };
        public string[] CommandKeys => MyCommandKeys;
        public string[] MandatoryArgKeys => null;

        private PlayFabAuthenticationContext context;
        private PlayFabApiSettings settings;
        private PlayFabAuthenticationInstanceAPI authApi;
        private PlayFabMultiplayerInstanceAPI multiplayerApi;

        // "Constants" defined by program inputs (vars or cmd-line)
        private TimeSpan CYCLE_DURATION_MINS = TimeSpan.FromMinutes(10);
        private TimeSpan CYCLE_PERIOD_SEC = TimeSpan.FromSeconds(30);
        private TimeSpan RETRY_DELAY_SEC = TimeSpan.FromSeconds(10);
        private int RETRY_COUNT = 5;
        private int[] GAP_THRESHOLDS = new[] { 10000, 10000, 1000, 400, 200, 100 };
        private int[] MAX_CAPACITY_PERCENT_THRESHOLDS = new[] { 1000, 1000, 100, 95, 80, 75 };
        private int[] STANDBY_THRESHOLDS = new[] { -1, -1, 0, 6, 9, 11 };

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
            ParseInputs(argsLc);

            var setupCode = LoginToPlayfab(argsLc);
            if (setupCode != 0)
                return setupCode;

            var cumulativeResult = new Tuple<int, Severity>(0, Severity.SEV_0);

            endOfCycle = DateTime.UtcNow + CYCLE_DURATION_MINS;
            while (endOfCycle > DateTime.UtcNow)
            {
                var eachSummary = GetBuildSummaryFromPlayfab();
                var eachResult = EvaluateBuildSummaries(bblVersions, eachSummary);

                // Combine the results
                cumulativeResult = new Tuple<int, Severity>(
                    cumulativeResult.Item1 + eachResult.Item1,
                    (Severity)Math.Max((byte)cumulativeResult.Item2, (byte)eachResult.Item2) // Least Error Seen
                );

                Thread.Sleep((int)CYCLE_PERIOD_SEC.TotalMilliseconds);
            }

            JcuUtil.FancyWriteToConsole("Finished Query Cycle");
            MakeAlert(null, worstBblSeverity, " <- Worst Bumblelion Error Level");
            MakeAlert(null, worstThSeverity, " <- Worst Thunderhead Error Level");
            MakeAlert(null, cumulativeResult.Item2, " <- Typical Error Level. Total Number of Alerts: " + cumulativeResult.Item1);

            return (cumulativeResult.Item2 <= Severity.SEV_3) ? cumulativeResult.Item1 : 0;
        }

        private void ParseInputs(Dictionary<string, string> argsLc)
        {
            if (!JenkinsConsoleUtility.TryGetArgVar(out bblVersions, argsLc, "BBL_VERSIONS"))
                bblVersions = "3.0.0;2.0.1";

            if (JenkinsConsoleUtility.TryGetArgVar(out string tempGapThresholds, argsLc, "GAP_THRESHOLDS"))
                try { GAP_THRESHOLDS = tempGapThresholds.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }
            if (JenkinsConsoleUtility.TryGetArgVar(out string tempStandby, argsLc, "STANDBY_THRESHOLDS"))
                try { STANDBY_THRESHOLDS = tempGapThresholds.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }
            if (JenkinsConsoleUtility.TryGetArgVar(out string tempMaxCap, argsLc, "MAX_CAPACITY_PERCENT_THRESHOLDS"))
                try { MAX_CAPACITY_PERCENT_THRESHOLDS = tempGapThresholds.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }

            if (JenkinsConsoleUtility.TryGetArgVar(out string tempCycleDuration, argsLc, "CYCLE_DURATION_MINS"))
                try { CYCLE_DURATION_MINS = TimeSpan.FromMinutes(double.Parse(tempCycleDuration)); } catch (Exception) { }
            if (JenkinsConsoleUtility.TryGetArgVar(out string tempCyclePeriod, argsLc, "CYCLE_PERIOD_SEC"))
                try { CYCLE_PERIOD_SEC = TimeSpan.FromSeconds(double.Parse(tempCyclePeriod)); } catch (Exception) { }
            if (JenkinsConsoleUtility.TryGetArgVar(out string tempRetryDelay, argsLc, "RETRY_DELAY_SEC"))
                try { RETRY_DELAY_SEC = TimeSpan.FromSeconds(double.Parse(tempRetryDelay)); } catch (Exception) { }
            if (JenkinsConsoleUtility.TryGetArgVar(out string tempRetryCount, argsLc, "RETRY_COUNT"))
                try { RETRY_COUNT = int.Parse(tempRetryCount); } catch (Exception) { }
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
            for (int i = 0; i < RETRY_COUNT; i++)
            {
                var tokenTask = authApi.GetEntityTokenAsync(null);
                tokenTask.Wait();

                if (string.IsNullOrEmpty(context.EntityToken))
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: CheckBblStandby was not able to authenticate as expected, sleeping...");
                    Thread.Sleep((int)RETRY_DELAY_SEC.TotalMilliseconds);
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

            for (int i = 0; i < RETRY_COUNT; i++)
            {
                var listBuildsTask = multiplayerApi.ListBuildSummariesAsync(listBuildsRequest);
                listBuildsTask.Wait();
                var buildSummaries = listBuildsTask?.Result?.Result?.BuildSummaries;
                if (buildSummaries == null)
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "ERROR: Was unable to list build summaries, sleeping...");
                    Thread.Sleep((int)RETRY_DELAY_SEC.TotalMilliseconds);
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

                    for (var i = 0; i < MAX_CAPACITY_PERCENT_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.Active >= (each.MaxServers * MAX_CAPACITY_PERCENT_THRESHOLDS[i] / 100))
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - " + MAX_CAPACITY_PERCENT_THRESHOLDS[i] + "% (" + each.CurrentServerStats.Active + "/" + each.MaxServers + ") Max Servers reached in region:" + each.Region);
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
