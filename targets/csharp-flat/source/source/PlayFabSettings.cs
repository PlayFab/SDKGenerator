using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Net.Http;

namespace PlayFab
{
    /// <summary>
    /// Indicates when the event is occurring when the PlayFabApiCallback occurs.
    /// </summary>
    public enum PlayFabApiEvent
    {
        /// <summary>
        /// The callback is firing just before the api request is sent.
        /// </summary>
        SendingRequest,
        /// <summary>
        /// The callback is firing just after recieving the response.
        /// </summary>
        ReceivedReply
    }

    /// <summary>
    /// Provides information just before api requests are sent and after responses are recieved.
    /// 
    /// The callback may not be called if an exception occurs during processing.
    /// </summary>
    public delegate void PlayFabApiCallback(PlayFabApiEvent apiEvent, PlayFabSettings settings, string apiName, string method, string url, string body);

    /// <summary>
    /// The PlayFabDefaultSettings provides the initial values for any new instances of <seealso cref="PlayFabSettings"/>.
    /// Once initialized, the values in <seealso cref="PlayFabSettings"/> can be deviate from these.
    /// </summary>
    public static class PlayFabDefaultSettings
    {
        public static JsonSerializerSettings JsonSettings = new JsonSerializerSettings()
        {
            NullValueHandling = NullValueHandling.Ignore,
            Converters = { new IsoDateTimeConverter() { DateTimeFormat = "yyyy'-'MM'-'dd'T'HH':'mm':'ss.FFF'Z'" } },
        };
        public static Formatting JsonFormatting = Formatting.None;

        /// <summary>
        /// Provides information just before api requests are sent and after responses are recieved.
        /// 
        /// The callback may not be called if an exception occurs during processing.
        /// </summary>
        public static PlayFabApiCallback ApiCallback = null;
        /// <summary>
        /// The message handler to use for http requests, allows overriding behaviour.
        /// </summary>
        public static HttpMessageHandler MessageHandler = null;
        /// <summary>
        /// The time to wait for web requests to complete
        /// </summary>
        public static TimeSpan? RequestTimeout = null; // The time to wait for web requests to complete

        public static bool UseDevelopmentEnvironment = false;
        public static string DevelopmentEnvironmentURL = ".playfabsandbox.com";
        public static string ProductionEnvironmentURL = ".playfabapi.com";

        /// <summary>
        /// You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        /// </summary>
        public static string TitleId = null;
        /// <summary>
        /// You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        /// </summary>
        public static string DeveloperSecretKey = null;

        /// <summary>
        /// Set this to the appropriate AD_TYPE_X constant below
        /// </summary>
        public static string AdvertisingIdType = null;
        /// <summary>
        /// Set this to corresponding device value
        /// </summary>
        public static string AdvertisingIdValue = null;

        /// <summary>
        /// DisableAdvertising is provided for completeness, but changing it is not suggested
        /// Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
        /// </summary>
        public static bool DisableAdvertising = false;

        public static readonly string AD_TYPE_IDFA = "Idfa";
        public static readonly string AD_TYPE_ANDROID_ID = "Adid";
    }

    /// <summary>
    /// An instance of PlayFab settings used to communicate with PlayFab. The values are initialized from
    /// those set in <seealso cref="PlayFabDefaultSettings"/>. PlayFabSettings is automatically created on
    /// creation of new instances of any Api class.
    /// </summary>
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

        /// <summary>
        /// Provides information just before api requests are sent and after responses are recieved.
        /// 
        /// The callback may not be called if an exception occurs during processing.
        /// </summary>
        public PlayFabApiCallback ApiCallback = PlayFabDefaultSettings.ApiCallback;
        /// <summary>
        /// The message handler to use for http requests, allows overriding behaviour.
        /// </summary>
        public HttpMessageHandler MessageHandler = PlayFabDefaultSettings.MessageHandler;
        /// <summary>
        /// The time to wait for web requests to complete
        /// </summary>
        public TimeSpan? RequestTimeout = PlayFabDefaultSettings.RequestTimeout;

        public bool UseDevelopmentEnvironment = PlayFabDefaultSettings.UseDevelopmentEnvironment;
        public string DevelopmentEnvironmentURL = PlayFabDefaultSettings.DevelopmentEnvironmentURL;
        public string ProductionEnvironmentURL = PlayFabDefaultSettings.ProductionEnvironmentURL;
        
        /// <summary>
        /// You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        /// </summary>
        public string TitleId = PlayFabDefaultSettings.TitleId;
        /// <summary>
        /// You must set this value for PlayFabSdk to work properly (Found in the Game Manager for your title, at the PlayFab Website)
        /// </summary>
        public string DeveloperSecretKey = PlayFabDefaultSettings.DeveloperSecretKey;

        /// <summary>
        /// Set this to the appropriate AD_TYPE_X constant below
        /// </summary>
        public string AdvertisingIdType = PlayFabDefaultSettings.AdvertisingIdType;
        /// <summary>
        /// Set this to corresponding device value
        /// </summary>
        public string AdvertisingIdValue = PlayFabDefaultSettings.AdvertisingIdValue;

        /// <summary>
        /// DisableAdvertising is provided for completeness, but changing it is not suggested
        /// Disabling this may prevent your advertising-related PlayFab marketplace partners from working correctly
        /// </summary>
        public bool DisableAdvertising = PlayFabDefaultSettings.DisableAdvertising;

        public string GetURL()
        {
            string baseUrl = UseDevelopmentEnvironment ? DevelopmentEnvironmentURL : ProductionEnvironmentURL;
            if (baseUrl.StartsWith("http"))
                return baseUrl;
            return "https://" + TitleId + baseUrl;
        }
    }
}
