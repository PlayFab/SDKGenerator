using PlayFab.Json;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace JenkinsConsoleUtility.Commands
{
    public class VersionVarWriter : ICommand
    {
        private const string DefaultApiSpecFilePath = "../../../../API_Specs"; // Relative path to Generate.js
        private const string DefaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master/";
        private const string DefaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec/";
        private static string _apiSpecPath, _apiSpecGitUrl, _apiSpecPfUrl; // Exactly one of these is expected to be set

        private static readonly string[] MyCommandKeys = { "versionVarWriter", "version" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { "workspacePath", "destFile", "sdkName" };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        public int Execute(Dictionary<string, string> args)
        {
            var destFile = JenkinsConsoleUtility.GetArgVar(args, "destFile");
            var workspacePath = JenkinsConsoleUtility.GetArgVar(args, "workspacePath");
            var sdkName = JenkinsConsoleUtility.GetArgVar(args, "sdkName");
            var sdkGenKey = GetSdkGenKey(sdkName);

            if (string.IsNullOrEmpty(sdkGenKey))
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Cannot convert sdkName into sdkGenKey: " + sdkName);
                return 1;
            }

            if (args.ContainsKey("apispecpath"))
                _apiSpecPath = JenkinsConsoleUtility.GetArgVar(args, "apiSpecPath");
            else if (args.ContainsKey("apispecgiturl"))
                _apiSpecGitUrl = JenkinsConsoleUtility.GetArgVar(args, "apiSpecGitUrl");
            else if (args.ContainsKey("apispecpfurl"))
                _apiSpecPfUrl = JenkinsConsoleUtility.GetArgVar(args, "apiSpecPfUrl");
            else
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Api-Spec input not defined.  Please input one of: apiSpecPath, apiSpecGitUrl, apiSpecPfUrl");
                return 1;
            }

            var versionJson = GetApiJson("SdkManualNotes.json");
            var sdkNotes = JsonWrapper.DeserializeObject<SdkManualNotes>(versionJson);
            string sdkVersionString;
            if (!sdkNotes.sdkVersion.TryGetValue(sdkGenKey, out sdkVersionString))
            {
                JenkinsConsoleUtility.FancyWriteToConsole("SdkManualNotes.json does not contain: " + sdkGenKey);
                JenkinsConsoleUtility.FancyWriteToConsole("SdkManualNotes.json:\n" + versionJson);
                return 1;
            }

            var sdkPieces = sdkVersionString.Split('.');
            using (var outputFile = new StreamWriter(Path.Combine(workspacePath, destFile)))
            {
                outputFile.WriteLine("sdkVersion = " + sdkVersionString);
                outputFile.WriteLine("sdkDate = " + sdkPieces[sdkPieces.Length - 1]);
                JenkinsConsoleUtility.FancyWriteToConsole("sdkVersion = " + sdkVersionString);
                JenkinsConsoleUtility.FancyWriteToConsole("sdkDate = " + sdkPieces[sdkPieces.Length - 1]);
            }
            return 0;
        }

        /// <summary>
        /// Fetch the given file based on the input settings (_apiSpecPath, _apiSpecGitUrl, or _apiSpecPfUrl)
        /// </summary>
        private static string GetApiJson(string filename)
        {
            if (_apiSpecPath != null)
            {
                if (string.IsNullOrEmpty(_apiSpecPath))
                    _apiSpecPath = DefaultApiSpecFilePath;
                using (var infile = File.OpenText(Path.Combine(_apiSpecPath, filename)))
                {
                    return infile.ReadToEnd();
                }
            }
            if (_apiSpecGitUrl != null)
            {
                if (string.IsNullOrEmpty(_apiSpecGitUrl))
                    _apiSpecGitUrl = DefaultApiSpecGitHubUrl;
                var getTask = SimpleHttpGet(_apiSpecGitUrl + filename);
                return getTask.Result;
            }
            if (_apiSpecPfUrl != null)
            {
                if (string.IsNullOrEmpty(_apiSpecPfUrl))
                    _apiSpecPfUrl = DefaultApiSpecPlayFabUrl;
                var getTask = SimpleHttpGet(GetPfServerUrl(filename));
                return getTask.Result;
            }
            return "";
        }

        /// <summary>
        /// Get the sdkVersion key that is used to generate a given SDK
        /// This bit of hard coding is particularly bad, because it's arbitrary, and historically not entirely reliable
        /// We need a better resolution for this
        /// </summary>
        private static string GetSdkGenKey(string sdkName)
        {
            switch (sdkName.ToLower())
            {
                case "actionscriptsdk": return "actionscript";
                case "cocos2d-xsdk": return "cpp-cocos2dx";
                case "csharpsdk": return "csharp";
                case "javascriptsdk": return "javascript";
                case "javasdk": return "java";
                case "luasdk": return "luasdk";
                case "nodesdk": return "js-node";
                case "postmancollection": return "postman";
                case "unitysdk": return "unity-v2";
                case "windowssdk": return "cpp-windows";
                case "lumberyardsdk": return "lumberyardsdk";
                case "objective_c_sdk": return "objc";
                case "playfabgameserver": return "csharp-unity-gameserver";
                case "unrealblueprintsdk": return "cpp-unreal";
                case "unrealcppsdk": return "cpp-ue4";
                case "windowssdkv1": return "windowssdk";
            }
            return null;
        }

        /// <summary>
        /// Convert a filename to a URL on the PlayFab API server
        ///  - If Possible, else use GitHub.
        /// </summary>
        private static string GetPfServerUrl(string filename)
        {
            switch (filename.ToLower())
            {
                case "admin.api.json":
                    return _apiSpecPfUrl + "AdminAPI";
                case "client.api.json":
                    return _apiSpecPfUrl + "ClientAPI";
                case "matchmaker.api.json":
                    return _apiSpecPfUrl + "MatchmakerAPI";
                case "server.api.json":
                    return _apiSpecPfUrl + "ServerAPI";
                case "playstreameventmodels.json":
                    return _apiSpecPfUrl + "PlayStreamEventModels";
                case "playstreamcommoneventmodels.json":
                    return _apiSpecPfUrl + "PlayStreamCommonEventModels";
                case "playstreamprofilemodel.json":
                    return _apiSpecPfUrl + "PlayStreamProfileModel";
                case "sdkmanualnotes.json": // SdkManualNotes is not hosted nor possible to be accurate on the pf-server
                    return DefaultApiSpecGitHubUrl + "SdkManualNotes.json";
            }
            return null;
        }

        /// <summary>
        /// Wrap and synchronize a HTTPS-get call
        /// Converts a url into the corresponding string-file-contents
        /// </summary>
        private static async Task<string> SimpleHttpGet(string fullUrl)
        {
            if (string.IsNullOrEmpty(fullUrl))
                return "";

            var client = new HttpClient();
            var httpResponse = await client.GetAsync(fullUrl);
            var result = await httpResponse.Content.ReadAsStringAsync();
            return httpResponse.IsSuccessStatusCode ? result : "";
        }

        /// <summary>
        /// The expected format of the SdkManualNotes.json file
        /// </summary>
        private class SdkManualNotes
        {
            public string description;
            public Dictionary<string, string> sdkVersion;
            public Dictionary<string, string> links;
        }
    }
}
