#if !NETFX_CORE || !XAMARIN

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public class OneDSSysHttpPlugin : IOneDSTransportPlugin
    {
        //private const string ONEDS_SERVICE_URL = "https://self.events.data.microsoft.com/OneCollector/1.0/";
        private const string ONEDS_SERVICE_URL = "https://mobile.events.data.microsoft.com/OneCollector/1.0/";

        private readonly HttpClient _client = new HttpClient();

        public async Task<object> DoPost(object request, Dictionary<string, string> extraHeaders)
        {
            var content = request as byte[];
            if (content == null)
            {

            }

            var fullUrl = ONEDS_SERVICE_URL;
            //var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);

            HttpResponseMessage httpResponse;
            string httpResponseString;
            using (var postBody = new ByteArrayContent(content))
            {
                string currentTimestampString = TimestampNow().ToString();
                postBody.Headers.Add("User-Agent", "OCT_C#");
                postBody.Headers.Add("sdk-version", "OCT_C#-0.11.1.0");
                postBody.Headers.Add("Content-Encoding", "gzip");
                postBody.Headers.Add("Content-Type", "application/bond-compact-binary");
                postBody.Headers.Add("Upload-Time", currentTimestampString);
                postBody.Headers.Add("client-time-epoch-millis", currentTimestampString);
                postBody.Headers.Add("Client-Id", "NO_AUTH");
                if (extraHeaders != null)
                    foreach (var headerPair in extraHeaders)
                        postBody.Headers.Add(headerPair.Key, headerPair.Value);

                try
                {
                    httpResponse = await _client.PostAsync(fullUrl, postBody);
                    httpResponseString = await httpResponse.Content.ReadAsStringAsync();
                }
                catch (HttpRequestException e)
                {
                    return new PlayFabError
                    {
                        Error = PlayFabErrorCode.ConnectionError,
                        ErrorMessage = e.InnerException.Message
                    };
                }
                catch (Exception e)
                {
                    return new PlayFabError
                    {
                        Error = PlayFabErrorCode.ConnectionError,
                        ErrorMessage = e.Message
                    };
                }
            }

            if (!httpResponse.IsSuccessStatusCode)
            {
                var error = new PlayFabError();

                if (string.IsNullOrEmpty(httpResponseString) || httpResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    error.HttpCode = (int)httpResponse.StatusCode;
                    error.HttpStatus = httpResponse.StatusCode.ToString();
                    return error;
                }

                PlayFabJsonError errorResult;
                try
                {
                    errorResult = null; // serializer.DeserializeObject<PlayFabJsonError>(httpResponseString);  // TO DO !!!!!!!!!!!!!!!!!!!!!!!!! replace null
                }
                catch (Exception e)
                {
                    error.HttpCode = (int)httpResponse.StatusCode;
                    error.HttpStatus = httpResponse.StatusCode.ToString();
                    error.Error = PlayFabErrorCode.JsonParseError;
                    error.ErrorMessage = e.Message;
                    return error;
                }

                error.HttpCode = errorResult.code;
                error.HttpStatus = errorResult.status;
                error.Error = (PlayFabErrorCode)errorResult.errorCode;
                error.ErrorMessage = errorResult.errorMessage;
                error.ErrorDetails = errorResult.errorDetails;
                return error;
            }

            if (string.IsNullOrEmpty(httpResponseString))
            {
                return new PlayFabError
                {
                    Error = PlayFabErrorCode.Unknown,
                    ErrorMessage = "Internal server error"
                };
            }

            return httpResponseString;
        }

        /// <summary>
        /// Calculates milliseconds since 1970
        /// </summary>
        /// <returns>Milliseconds since 1970</returns>
        private static long TimestampNow()
        {
            return (DateTime.UtcNow.Ticks - (new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).Ticks)) / 10000;
        }
    }
}
#endif
