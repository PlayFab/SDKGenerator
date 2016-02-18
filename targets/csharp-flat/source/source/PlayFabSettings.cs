using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Net.Http;

namespace PlayFab
{
    public static class PlayFabDefaultSettings
    {
        public static JsonSerializerSettings JsonSettings = new JsonSerializerSettings()
        {
            NullValueHandling = NullValueHandling.Ignore,
            Converters = { new IsoDateTimeConverter() { DateTimeFormat = "yyyy'-'MM'-'dd'T'HH':'mm':'ss.FFF'Z'" } },
        };
        public static Formatting JsonFormatting = Formatting.None;

        public static HttpMessageHandler MessageHandler = null; // The default message handler for http requests
        public static TimeSpan? RequestTimeout = null; // The time to wait for web requests to complete

        public static bool UseDevelopmentEnvironment = false;
        public static string DevelopmentEnvironmentURL = ".playfabsandbox.com";
        public static string ProductionEnvironmentURL = ".playfabapi.com";
        public static string TitleId; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        public static string DeveloperSecretKey = null; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        internal static string LogicServerURL = null; // Assigned by GetCloudScriptUrl, used by RunCloudScript
        public static string AdvertisingIdType = null; // Set this to the appropriate AD_TYPE_X constant below
        public static string AdvertisingIdValue = null; // Set this to corresponding device value

        // DisableAdvertising is provided for completeness, but changing it is not suggested
        // Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
        public static bool DisableAdvertising = false;

        public static readonly string AD_TYPE_IDFA = "Idfa";
        public static readonly string AD_TYPE_ANDROID_ID = "Android_Id";
    }

    public class PlayFabSettings
    {
        public PlayFabSettings()
        {
        }

        public PlayFabSettings(string titleId)
        {
            TitleId = titleId;
        }

        public PlayFabSettings(string titleId, string developerSecretKey)
            : this(titleId)
        {
            DeveloperSecretKey = developerSecretKey;
        }

        public JsonSerializerSettings JsonSettings = PlayFabDefaultSettings.JsonSettings;
        public Formatting JsonFormatting = PlayFabDefaultSettings.JsonFormatting;

        public HttpMessageHandler MessageHandler = PlayFabDefaultSettings.MessageHandler; // The default message handler for http requests
        public TimeSpan? RequestTimeout = PlayFabDefaultSettings.RequestTimeout; // The time to wait for web requests to complete

        public bool UseDevelopmentEnvironment = PlayFabDefaultSettings.UseDevelopmentEnvironment;
        public string DevelopmentEnvironmentURL = PlayFabDefaultSettings.DevelopmentEnvironmentURL;
        public string ProductionEnvironmentURL = PlayFabDefaultSettings.ProductionEnvironmentURL;
        public string TitleId = PlayFabDefaultSettings.TitleId; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        public string DeveloperSecretKey = PlayFabDefaultSettings.DeveloperSecretKey; // You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        internal string LogicServerURL = PlayFabDefaultSettings.LogicServerURL; // Assigned by GetCloudScriptUrl, used by RunCloudScript
        public string AdvertisingIdType = PlayFabDefaultSettings.AdvertisingIdType; // Set this to the appropriate AD_TYPE_X constant below
        public string AdvertisingIdValue = PlayFabDefaultSettings.AdvertisingIdValue; // Set this to corresponding device value

        // DisableAdvertising is provided for completeness, but changing it is not suggested
        // Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
        public bool DisableAdvertising = PlayFabDefaultSettings.DisableAdvertising;

        public string GetLogicURL()
        {
            return LogicServerURL;
        }

        public string GetURL()
        {
            string baseUrl = UseDevelopmentEnvironment ? DevelopmentEnvironmentURL : ProductionEnvironmentURL;
            if (baseUrl.StartsWith("http"))
                return baseUrl;
            return "https://" + TitleId + baseUrl;
        }
    }
}
