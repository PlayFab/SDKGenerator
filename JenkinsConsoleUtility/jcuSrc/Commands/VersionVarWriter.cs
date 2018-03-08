using PlayFab.Json;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace JenkinsConsoleUtility.Commands
{
    public class VersionVarWriter : ICommand
    {
        private const string DefaultApiSpecFilePath = "../../../../API_Specs"; // Relative path from default VS output folder
        private const string DefaultApiSpecGitHubUrl = "https://raw.githubusercontent.com/PlayFab/API_Specs/master/";
        private const string DefaultApiSpecPlayFabUrl = "https://www.playfabapi.com/apispec/";
        private string _apiSpecPath, _apiSpecGitUrl, _apiSpecPfUrl; // Exactly one of these is expected to be set

        private static readonly string[] MyCommandKeys = { "versionVarWriter", "version" };
        public string[] CommandKeys { get { return MyCommandKeys; } }
        private static readonly string[] MyMandatoryArgKeys = { "sdkName" };
        public string[] MandatoryArgKeys { get { return MyMandatoryArgKeys; } }

        // If this command runs, make the results accessible to other modules
        public static string sdkVersionString;
        public static string major;
        public static string minor;
        public static string date;
        public static bool set = false;

        public int Execute(Dictionary<string, string> argsLc, Dictionary<string, string> argsCased)
        {
            string destFile, workspacePath;
            JenkinsConsoleUtility.TryGetArgVar(out destFile, argsLc, "destFile");
            JenkinsConsoleUtility.TryGetArgVar(out workspacePath, argsLc, "workspacePath");
            var sdkName = JenkinsConsoleUtility.GetArgVar(argsLc, "sdkName");
            var sdkGenKey = GetSdkGenKey(sdkName);

            if (argsLc.ContainsKey("apispecpath"))
                _apiSpecPath = JenkinsConsoleUtility.GetArgVar(argsLc, "apiSpecPath");
            else if (argsLc.ContainsKey("apispecgiturl"))
                _apiSpecGitUrl = JenkinsConsoleUtility.GetArgVar(argsLc, "apiSpecGitUrl");
            else if (argsLc.ContainsKey("apispecpfurl"))
                _apiSpecPfUrl = JenkinsConsoleUtility.GetArgVar(argsLc, "apiSpecPfUrl");
            else
            {
                JenkinsConsoleUtility.FancyWriteToConsole("Api-Spec input not defined.  Please input one of: apiSpecPath, apiSpecGitUrl, apiSpecPfUrl");
                return 1;
            }

            var versionJson = GetApiJson("SdkManualNotes.json");
            var sdkNotes = JsonWrapper.DeserializeObject<SdkManualNotes>(versionJson);
            if (!sdkNotes.sdkVersion.TryGetValue(sdkGenKey, out sdkVersionString))
            {
                JenkinsConsoleUtility.FancyWriteToConsole("SdkManualNotes.json does not contain: " + sdkGenKey);
                JenkinsConsoleUtility.FancyWriteToConsole("SdkManualNotes.json:\n" + versionJson);
                return 1;
            }

            var sdkPieces = sdkVersionString.Split('.');
            major = sdkPieces[0]; minor = sdkPieces[1]; date = sdkPieces[sdkPieces.Length - 1];
            set = true;

            // Write this to a Jenkins environment variable file, if defined
            if (!string.IsNullOrEmpty(destFile))
            {
                using (var outputFile = new StreamWriter(Path.Combine(workspacePath, destFile)))
                {
                    outputFile.WriteLine("sdkVersion = " + sdkVersionString);
                    outputFile.WriteLine("sdkDate = " + date);
                    JenkinsConsoleUtility.FancyWriteToConsole("sdkVersion = " + sdkVersionString);
                    JenkinsConsoleUtility.FancyWriteToConsole("sdkDate = " + date);
                }
            }
            return 0;
        }

        /// <summary>
        /// Fetch the given file based on the input settings (_apiSpecPath, _apiSpecGitUrl, or _apiSpecPfUrl)
        /// </summary>
        private string GetApiJson(string filename)
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
        private string GetSdkGenKey(string sdkName)
        {
            switch (sdkName.ToLower())
            {
                // Single repo maps to mismatched foldername
                case "actionscriptsdk": return "actionscript";
                case "cocos2d-xsdk": return "cpp-cocos2dx";
                case "csharpsdk": return "csharp";
                case "javascriptsdk": return "javascript";
                case "javasdk": return "java";
                case "objective_c_sdk": return "objc";
                case "playfabgameserver": return "csharp-unity-gameserver";
                // Multiple repos map to the same folder
                case "nodesdk": case "nodebetasdk": return "js-node";
                case "postmancollection": case "postmanbeta": return "postman";
                case "unitysdk": case "unitypsn": case "unityxbox": case "unitybeta": case "unityeditorextensions": return "unity-v2";
                case "unrealblueprintsdk": case "uebppsnsdk": case "uebpxboxsdk": return "cpp-unreal";
                case "unrealcppsdk": case "uecpppsnsdk": case "uecppxboxsdk": return "cpp-ue4";
                case "windowssdk": case "winbetasdk": case "winpsnsdk": case "winxboxsdk": return "windowssdk";

                default: return sdkName.ToLower(); // Most new sdks have matching names
            }
        }

        /// <summary>
        /// Convert a filename to a URL on the PlayFab API server
        ///  - If Possible, else use GitHub.
        /// </summary>
        private string GetPfServerUrl(string filename)
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
        private async Task<string> SimpleHttpGet(string fullUrl)
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
