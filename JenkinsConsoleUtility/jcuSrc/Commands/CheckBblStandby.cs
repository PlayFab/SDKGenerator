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
        private static readonly string[] MyMandatoryArgKeys = { "buildidentifier" };
        public string[] MandatoryArgKeys => MyMandatoryArgKeys;

        private PlayFabAuthenticationContext context;
        private PlayFabApiSettings settings;
        private PlayFabAuthenticationInstanceAPI authApi;
        private PlayFabMultiplayerInstanceAPI multiplayerApi;

        public CheckBblStandby()
        {
            context = new PlayFabAuthenticationContext();
            settings = new PlayFabApiSettings();
            authApi = new PlayFabAuthenticationInstanceAPI(settings, context);
            multiplayerApi = new PlayFabMultiplayerInstanceAPI(settings, context);
        }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {

            var testTitleData = TestTitleDataLoader.Load(argsLc);
            if (string.IsNullOrEmpty(context.EntityToken))
            {
                JenkinsConsoleUtility.FancyWriteToConsole(System.ConsoleColor.Red, "ERROR: Could not load testTitleData.");
                return 1;
            }

            settings.TitleId = testTitleData.titleId;
            settings.DeveloperSecretKey = testTitleData.developerSecretKey;

            var tokenTask = authApi.GetEntityTokenAsync(null);
            tokenTask.Wait();
            if (string.IsNullOrEmpty(context.EntityToken))
            {
                JenkinsConsoleUtility.FancyWriteToConsole(System.ConsoleColor.Red, "ERROR: CheckBblStandby was not able to authenticate as expected.");
                return 1;
            }

            var listBuildsRequest = new ListBuildSummariesRequest();
            var listBuildsTask = multiplayerApi.ListBuildSummariesAsync(listBuildsRequest);
            listBuildsTask.Wait();
            var buildSummaries = listBuildsTask?.Result?.Result?.BuildSummaries;
            if (buildSummaries == null)
            {
                JenkinsConsoleUtility.FancyWriteToConsole(System.ConsoleColor.Red, "ERROR: Was unable to list build summaries.");
                return 1;
            }

            return 0;
        }
    }
}
