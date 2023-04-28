using System;
using System.Collections.Generic;
using System.IO;
using JenkinsConsoleUtility.Util;
using Octokit;
using PlayFab.Json;

namespace JenkinsConsoleUtility.Commands
{
    class GitApiCommand : ICommand
    {
        private const string GitOwner = "PlayFab";
        private const string ProgramHeader = "JenkinsConsoleUtility";

        // TODO: Validate this
        //private readonly Type[] _commandDependency = { typeof(VersionVarWriter) };
        //public Type[] CommandDependency => _commandDependency;
        private readonly string[] _commandKeys = { "GitApi" };
        public string[] CommandKeys { get { return _commandKeys; } }
        private readonly string[] _mandatoryArgKeys = { "sdkName", "GITHUB_CREDENTIALS_FILE" };
        public string[] MandatoryArgKeys { get { return _mandatoryArgKeys; } }

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            var sdkName = JenkinsConsoleUtility.GetArgVar(argsCased, "sdkName");
            var credsFilename = JenkinsConsoleUtility.GetArgVar(argsLc, "GITHUB_CREDENTIALS_FILE");
            if (!VersionVarWriter.set || !File.Exists(credsFilename))
                return 1;

            var credsJson = File.ReadAllText(credsFilename);
            var creds = JsonWrapper.DeserializeObject<GitHubCredentials>(credsJson);

            try
            {
                var header = new ProductHeaderValue(ProgramHeader);
                var client = new GitHubClient(header);
                client.Credentials = new Credentials(creds.token);
                var releaseRequest = new GitHubReleaseRequest(sdkName, VersionVarWriter.major, VersionVarWriter.minor, VersionVarWriter.date);
                var result = client.Repository.Release.Create(GitOwner, sdkName, releaseRequest).Result; 
                if (!SeemsLegit(result, releaseRequest))
                    return 1;

                var sdkRepo = client.Repository.Get(GitOwner, sdkName).Result;
                JcuUtil.FancyWriteToConsole(ConsoleColor.Green, sdkRepo.CloneUrl);
            }
            catch (AggregateException agEx)
            {
                foreach (var e in agEx.InnerExceptions)
                    JcuUtil.FancyWriteToConsole(ConsoleColor.Red, e.ToString());
                return 1;
            }

            return 0;
        }

        private bool SeemsLegit(Release response, NewRelease request)
        {
            return response != null
                && response.Url != null
                && response.AssetsUrl != null
                && response.UploadUrl != null
                && response.HtmlUrl != null
                && response.Id != 0
                && response.TagName == request.TagName
                && response.TargetCommitish == request.TargetCommitish
                && response.Name == request.Name
                && response.Draft == request.Draft
                && response.Prerelease == request.Prerelease
                && Math.Abs((response.CreatedAt - DateTime.UtcNow).TotalDays) < 2
                && response.PublishedAt.HasValue
                && Math.Abs((response.PublishedAt.Value - DateTime.UtcNow).TotalDays) < 2
                && response.TarballUrl != null
                && response.ZipballUrl != null
                && response.Body == request.Body
                && response.Author != null; // This one is a big object which ultimately says PlayFabJenkinsBot, but... if we got this far, it's probably right.  :D
        }

        private class GitHubCredentials
        {
#pragma warning disable 0649
            public string token;
#pragma warning restore 0649
        }

        private class GitHubReleaseRequest : NewRelease
        {
            private const string TagFormat = "{major}.{minor}.{date}";
            private const string NameFormat = "{sdkName} version {major}.{minor}";
            private const string BodyFormat = "https://learn.microsoft.com/gaming/playfab/release-notes/#{date}";

            public GitHubReleaseRequest(string sdkName, string major, string minor, string date) : base(TagFormat.Replace("{major}", major).Replace("{minor}", minor).Replace("{date}", date))
            {
                Name = NameFormat.Replace("{sdkName}", sdkName).Replace("{major}", major).Replace("{minor}", minor);
                Body = BodyFormat.Replace("{date}", date);
                TargetCommitish = "versioned";
                Draft = false;
                Prerelease = false;
            }
        }
    }
}
