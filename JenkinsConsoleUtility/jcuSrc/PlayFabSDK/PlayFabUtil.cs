using System;
using Newtonsoft.Json;

namespace PlayFab
{
    [AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
    public class Unordered : Attribute
    {
        public string SortProperty { get; set; }

        public Unordered() { }

        public Unordered(string sortProperty)
        {
            SortProperty = sortProperty;
        }
    }

    public static class Util
    {
        public static string GetErrorReport(PlayFabError error)
        {
            if (error == null)
                return null;
            string output = error.ErrorMessage ?? "";
            if (error.ErrorDetails != null)
                foreach (var pair in error.ErrorDetails)
                    foreach (var eachMsg in pair.Value)
                        output += "\n" + pair.Key + ": " + eachMsg;
            return output;
        }

        public class TimeSpanFloatSeconds : JsonConverter
        {
            public TimeSpanFloatSeconds()
            {
            }

            public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
            {
                TimeSpan timeSpan = (TimeSpan)value;
                serializer.Serialize(writer, timeSpan.TotalSeconds);
            }

            public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
            {
                return TimeSpan.FromSeconds(serializer.Deserialize<float>(reader));
            }

            public override bool CanConvert(Type objectType)
            {
                return objectType == typeof(TimeSpan);
            }
        }
    }
}
