using JenkinsConsoleUtility.Util;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace JenkinsConsoleUtility.jcuSrc.Commands
{
    class GetAdoBuilds : ICommand
    {
        private const string expectedFolderPrefix = "\\PlayFabSdk";
        private const string pipelinesUrl = "https://dev.azure.com/PlayFabInternal/Main/_apis/pipelines";
        private const string buildsUrl = "https://dev.azure.com/PlayFabInternal/Main/_apis/build/builds?definitions={definitionId}";
        // public static readonly List<string> filterIds = new List<string> { "refs/heads/master", "refs/heads/develop" };

        private static readonly string[] MyCommandKeys = { "getbuilds", "builds", "adobuilds" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { "kustoConfig", "pat" };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        private int days;
        private string pat;
        private KustoWriter kustoWriter;

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            Task<int> execTask = Task.Run(async () => { return await ExecuteAsync(argsLc, argsCased); });
            return execTask.Result;
        }

        private async Task<int> ExecuteAsync(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            List<AdoBuildResultRow> rows = new List<AdoBuildResultRow>();

            string daysStr;
            if (!JenkinsConsoleUtility.TryGetArgVar(out daysStr, argsLc, "days") || !int.TryParse(daysStr, out days))
                days = 3;
            pat = JenkinsConsoleUtility.GetArgVar(argsLc, "pat");
            string kustoConfigFile = JenkinsConsoleUtility.GetArgVar(argsLc, "kustoConfig");
            if (!File.Exists(kustoConfigFile))
                throw new ArgumentException("kustoConfig file does not exist.");
            string kustoConfigJson = File.ReadAllText(kustoConfigFile);
            KustoConfig kustoConfig = JsonConvert.DeserializeObject<KustoConfig>(kustoConfigJson);
            kustoWriter = new KustoWriter(kustoConfig);

            GetPipelinesResult pipelines = await MakeAdoApiCall<GetPipelinesResult>(pipelinesUrl, "pipelines.json");
            if (!FilterPipelines(pipelines.value))
            {
                JcuUtil.FancyWriteToConsole(ConsoleColor.Red, "No pipelines found in expected folder: " + expectedFolderPrefix);
                return 1;
            }

            int buildsWritten = 0;
            foreach (var eachPipeline in pipelines.value)
            {
                GetBuildsResult builds = await MakeAdoApiCall<GetBuildsResult>(buildsUrl.Replace("{definitionId}", eachPipeline.id.ToString()), "builds" + eachPipeline.id +".json");
                var buildReports = ProcessBuildList(builds.value);
                foreach (var eachReportPair in buildReports)
                {
                    JcuUtil.FancyWriteToConsole(ConsoleColor.DarkCyan, eachReportPair.Value.name);
                    foreach (var eachDailyResultPair in eachReportPair.Value.dailyResults)
                    {
                        if (eachDailyResultPair.Key > days)
                            continue; // Skip the old tests

                        DateTime date;
                        int passed, failed, others, total;
                        BuildReport.Count(eachDailyResultPair.Value, out date, out passed, out failed, out others, out total);
                        JcuUtil.FancyWriteToConsole(
                            ConsoleColor.White, eachDailyResultPair.Key, " days ago(", date, "): (",
                            ConsoleColor.Green, "P: ", passed, ConsoleColor.White, "/",
                            ConsoleColor.Red, "F:", failed, ConsoleColor.White, "/",
                            ConsoleColor.DarkYellow, "O:", others, ConsoleColor.White, "/",
                            ConsoleColor.Cyan, "T:", total, ConsoleColor.White, ")");
                        rows.Add(new AdoBuildResultRow(eachReportPair.Value.name, passed, failed, others, total, date));
                    }
                }
                buildsWritten += builds.value.Count;
            }

            bool success = kustoWriter.WriteDataForTable(false, rows);
            return success && buildsWritten > 0 ? 0 : 1;
        }

        private async Task<T> MakeAdoApiCall<T>(string adoUrl, string cacheFileName) where T : class
        {
            string jsonResult = null;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

                    var b64pat = Convert.ToBase64String(System.Text.ASCIIEncoding.ASCII.GetBytes(string.Format("{0}:{1}", "", pat)));
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", b64pat);

                    using (HttpResponseMessage response = client.GetAsync(adoUrl).Result)
                    {
                        response.EnsureSuccessStatusCode();
                        jsonResult = await response.Content.ReadAsStringAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return null;
            }

            var deserializedObj = JsonConvert.DeserializeObject<T>(jsonResult);
            if (!string.IsNullOrEmpty(cacheFileName))
            {
                var tabbedJson = JsonConvert.SerializeObject(deserializedObj, Formatting.Indented);
                File.WriteAllText(cacheFileName, tabbedJson);
            }
            return deserializedObj;
        }

        // Filters in-place, modifying the list that is provided
        public bool FilterPipelines(List<Pipeline> pipelines)
        {
            // Remove any pipelines that don't start with the expected prefix
            for (int i = pipelines.Count - 1; i >= 0; i--)
                if (!pipelines[i].folder.StartsWith(expectedFolderPrefix))
                    pipelines.RemoveAt(i);
            return pipelines.Count > 0;
        }

        public Dictionary<int, BuildReport> ProcessBuildList(List<BuildResult> allBuilds)
        {
            Dictionary<int, BuildReport> reports = new Dictionary<int, BuildReport>();
            var now = DateTime.UtcNow;
            var today = new DateTime(now.Year, now.Month, now.Day);

            foreach (var eachBuild in allBuilds)
            {
                BuildReport eachReport;
                if (!reports.TryGetValue(eachBuild.definition.id, out eachReport))
                    reports[eachBuild.definition.id] = eachReport = new BuildReport(eachBuild.definition.id, eachBuild.definition.name);

                int daysOld = (today - new DateTime(eachBuild.finishTime.Year, eachBuild.finishTime.Month, eachBuild.finishTime.Day)).Days;
                eachReport.Add(daysOld, eachBuild);
            }

            return reports;
        }
    }

    class BuildReport
    {
        public readonly int id;
        public readonly string name;
        public Dictionary<int, List<BuildResult>> dailyResults = new Dictionary<int, List<BuildResult>>();

        public BuildReport(int id, string name)
        {
            this.id = id;
            this.name = name;
        }

        public void Add(int daysOld, BuildResult result)
        {
            List<BuildResult> bucket;
            if (!dailyResults.TryGetValue(daysOld, out bucket))
                dailyResults[daysOld] = bucket = new List<BuildResult>();
            bucket.Add(result);

        }

        public static void Count(List<BuildResult> results, out DateTime date, out int passed, out int failed, out int others, out int total)
        {
            passed = failed = others = total = 0;
            date = DateTime.MinValue;

            foreach (var eachResult in results)
            {
                date = new DateTime(eachResult.finishTime.Year, eachResult.finishTime.Month, eachResult.finishTime.Day);

                switch (eachResult.result)
                {
                    case "succeeded":
                        passed++;
                        total++;
                        break;
                    case "failed":
                        failed++;
                        total++;
                        break;
                    case "canceled":
                        others++;
                        total++;
                        break;
                    default:
                        others++;
                        total++;
                        Console.WriteLine(" --- Unexpected Build Result: " + eachResult.result);
                        break;
                }
            }
        }
    }

#pragma warning disable 0649 // All these are json-assigned
    class GetPipelinesResult
    {
        public int count;
        public List<Pipeline> value;
    }

    class Pipeline
    {
        public int id;
        public string name;
        public string folder;
    }

    class GetBuildsResult
    {
        public int count;
        public List<BuildResult> value;
    }

    class BuildResult
    {
        public int id;
        public string buildNumber;
        public string status;
        public string result;
        public DateTime finishTime;
        public string sourceBranch;
        public BuildDefn definition;
        public BuildRepository repository;

        public override string ToString()
        {
            return $"({id}): {result} at {finishTime}: {repository.name} from {sourceBranch} ({definition.id})";
        }
    }

    class BuildDefn
    {
        public int id;
        public string name;
    }

    class BuildRepository
    {
        public string type;
        public string name;
        public string url;
    }
#pragma warning restore 0649
}
