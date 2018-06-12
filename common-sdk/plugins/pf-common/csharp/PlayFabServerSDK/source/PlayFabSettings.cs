
namespace PlayFab
{
    public class PlayFabSettings
    {
        public const string SdkVersion = "1.28.180618";
        public const string BuildIdentifier = "csharpsdk_manual";
        public const string SdkVersionString = "CSharpSDK-1.28.180618";

        /// <summary> This is for PlayFab internal debugging.  Generally you shouldn't touch this </summary>
        public static bool UseDevelopmentEnvironment = false;
        /// <summary> This is for PlayFab internal debugging.  Generally you shouldn't touch this </summary>
        public static string DevelopmentEnvironmentUrl = ".playfabsandbox.com";
        /// <summary> This is only for customers running a private cluster.  Generally you shouldn't touch this </summary>
        public static string ProductionEnvironmentUrl = ".playfabapi.com";
        /// <summary> Session token for Entity API. Auto-Populated by GetEntityToken method. </summary>
        internal static string EntityToken = null;
        /// <summary> Session ticket for Client API. Auto-Populated by any login or registration call. </summary>
        internal static string ClientSessionTicket = null;
        /// <summary> You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website) </summary>
        public static string DeveloperSecretKey = null;
        /// <summary> You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website) </summary>
        public static string TitleId;
        public static ErrorCallback GlobalErrorHandler;

        public static string GetFullUrl(string apiCall)
        {
            var baseUrl = UseDevelopmentEnvironment ? DevelopmentEnvironmentUrl : ProductionEnvironmentUrl;
            if (baseUrl.StartsWith("http"))
                return baseUrl;
            return "https://" + TitleId + baseUrl + apiCall;
        }
    }
}
