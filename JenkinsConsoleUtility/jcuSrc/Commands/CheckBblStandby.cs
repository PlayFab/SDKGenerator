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
        public string[] CommandKeys { get { return MyCommandKeys; } }
        public string[] MandatoryArgKeys { get { return null; } }

        private PlayFabAuthenticationContext context;
        private PlayFabApiSettings settings;
        private PlayFabAuthenticationInstanceAPI authApi;
        private PlayFabMultiplayerInstanceAPI multiplayerApi;

        // "Constants" defined by program inputs (vars or cmd-line)
        private TimeSpan CYCLE_DURATION_MINS = TimeSpan.FromMinutes(10);
        private TimeSpan CYCLE_PERIOD_SEC = TimeSpan.FromSeconds(30);
        private TimeSpan RETRY_DELAY_SEC = TimeSpan.FromSeconds(10);
        private int RETRY_COUNT = 5;
        private int[] GAP_MAX_THRESHOLDS = new[] { 10000, 10000, 1000, 400, 200, 100 };
        private int[] MAX_CAPACITY_PERCENT_THRESHOLDS = new[] { 1000, 1000, 100, 95, 80, 75 };
        private int[] STANDBY_MIN_THRESHOLDS = new[] { -1, -1, 0, 6, 9, 11 };
        private string BBL_VERSIONS;

        private DateTime endOfCycle;
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
            ParseInputs(argsCased);

            var setupCode = LoginToPlayfab(argsLc);
            if (setupCode != 0)
                return setupCode;

            var cumulativeResult = new Tuple<int, Severity>(0, Severity.SEV_0);

            endOfCycle = DateTime.UtcNow + CYCLE_DURATION_MINS;
            while (endOfCycle > DateTime.UtcNow)
            {
                var eachSummary = GetBuildSummaryFromPlayfab();
                var eachResult = EvaluateBuildSummaries(BBL_VERSIONS, eachSummary);

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

        private void ParseInputs(Dictionary<string, string> argsCased)
        {
            if (!JenkinsConsoleUtility.TryGetArgVar(out BBL_VERSIONS, argsCased, "BBL_VERSIONS"))
                BBL_VERSIONS = "3.0.0;2.0.1";

            string tempGapThresholds = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempGapThresholds, argsCased, "GAP_MAX_THRESHOLDS"))
            {
                try { GAP_MAX_THRESHOLDS = tempGapThresholds.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }
            }

            string tempStandby = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempStandby, argsCased, "STANDBY_MIN_THRESHOLDS"))
            {
                try { STANDBY_MIN_THRESHOLDS = tempStandby.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }
            }

            string tempMaxCap = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempMaxCap, argsCased, "MAX_CAPACITY_PERCENT_THRESHOLDS"))
            {
                try { MAX_CAPACITY_PERCENT_THRESHOLDS = tempMaxCap.Split(';').Select(s => int.Parse(s)).ToArray(); } catch (Exception) { }
            }

            string tempCycleDuration = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempCycleDuration, argsCased, "CYCLE_DURATION_MINS"))
            {
                try { CYCLE_DURATION_MINS = TimeSpan.FromMinutes(double.Parse(tempCycleDuration)); } catch (Exception) { }
            }

            string tempCyclePeriod = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempCyclePeriod, argsCased, "CYCLE_PERIOD_SEC"))
            {
                try { CYCLE_PERIOD_SEC = TimeSpan.FromSeconds(double.Parse(tempCyclePeriod)); } catch (Exception) { }
            }

            string tempRetryDelay = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempRetryDelay, argsCased, "RETRY_DELAY_SEC"))
            {
                try { RETRY_DELAY_SEC = TimeSpan.FromSeconds(double.Parse(tempRetryDelay)); } catch (Exception) { }
            }

            string tempRetryCount = "";
            if (JenkinsConsoleUtility.TryGetArgVar(out tempRetryCount, argsCased, "RETRY_COUNT"))
            {
                try { RETRY_COUNT = int.Parse(tempRetryCount); } catch (Exception) { }
            }
        }

        private int LoginToPlayfab(Dictionary<string, string> argsLc)
        {
            // Get Login Credentials
            var testTitleData = TestTitleDataLoader.Load(argsLc);
            if (testTitleData == null)
                return 1;

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
                var listBuildsTask = multiplayerApi.ListBuildSummariesV2Async(listBuildsRequest);
                listBuildsTask.Wait();

                if (listBuildsTask != null && listBuildsTask.Result != null && listBuildsTask.Result.Result != null)
                {
                    var buildSummaries = listBuildsTask.Result.Result.BuildSummaries;

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
                string versionString = "";
                if (!eachSummary.Metadata.TryGetValue("Version", out versionString))
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
                    for (var i = 0; i < GAP_MAX_THRESHOLDS.Length; i++)
                    {
                        if (gap >= GAP_MAX_THRESHOLDS[i])
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

                    for (var i = 0; i < STANDBY_MIN_THRESHOLDS.Length; i++)
                    {
                        if (each.CurrentServerStats.StandingBy <= STANDBY_MIN_THRESHOLDS[i])
                        {
                            MakeAlert(bblAlerts, (Severity)i, versionString + ", " + eachSummary.BuildId + " - Low Standby in region:" + each.Region + ", " + each.CurrentServerStats.StandingBy + "<=" + STANDBY_MIN_THRESHOLDS[i]);
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
