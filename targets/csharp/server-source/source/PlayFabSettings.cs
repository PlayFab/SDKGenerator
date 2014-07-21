using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace PlayFab
{

	public class PlayFabSettings
    {

        public static JsonSerializerSettings JsonSettings = new JsonSerializerSettings()
        {
            NullValueHandling = NullValueHandling.Ignore,
            Converters = { new IsoDateTimeConverter() { DateTimeFormat = "yyyy'-'MM'-'dd'T'HH':'mm':'ss.FFF'Z'" } },
        };
        public static Formatting JsonFormatting = Formatting.None;

        public static bool UseDevelopmentEnvironment = false;
		public static string DevelopmentEnvironmentURL = "https://api.playfabdev.com";
		public static string ProductionEnvironmentURL = "https://api.playfab.com";
		public static string TitleId = null;
		public static ErrorCallback GlobalErrorHandler  { get; set; }
		public static string DeveloperSecretKey = null;
		
		public static string GetURL()
		{
			return UseDevelopmentEnvironment ? DevelopmentEnvironmentURL : ProductionEnvironmentURL;
		}
	}
}