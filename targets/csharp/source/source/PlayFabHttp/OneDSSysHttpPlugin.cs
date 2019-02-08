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
                var error = new PlayFabError();
                error.Error = PlayFabErrorCode.InvalidContentType;
                error.ErrorMessage = "Binary content for HTTP body is null";
                return error;
            }

            var fullUrl = ONEDS_SERVICE_URL;
            //var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);

            HttpResponseMessage httpResponse;
            string httpResponseString;
            using (var postBody = new ByteArrayContent(content))
            {
                string currentTimestampString = TimestampNow().ToString();
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

            int httpCode = (int)httpResponse.StatusCode;
            if (httpCode >= 200 && httpCode < 300)
            {
                var responseObj = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject(httpResponseString) as Json.JsonObject;
                try
                {
                    ulong oneDSResult = ulong.Parse(responseObj["acc"].ToString());
                    if (oneDSResult > 0)
                    {
                        // successful response
                        return httpResponseString;
                    }
                    else
                    {
                        var error = new PlayFabError();
                        error.HttpCode = httpCode;
                        error.HttpStatus = httpResponseString;
                        error.Error = PlayFabErrorCode.PartialFailure;
                        error.ErrorMessage = "OneDS server did not accept events";
                        return error;
                    }
                }
                catch (Exception e)
                {
                    var error = new PlayFabError();
                    error.HttpCode = httpCode;
                    error.HttpStatus = httpResponseString;
                    error.Error = PlayFabErrorCode.JsonParseError;
                    error.ErrorMessage = "Failed to parse response from OneDS server";
                    return error;
                }
            }
            else if ((httpCode >= 500 && httpCode != 501 && httpCode != 505)
                || httpCode == 408 || httpCode == 429)
            {
                // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
                // are eligible for retries

                // TODO implement a retry policy
                // As a placeholder, return an immediate error
                var error = new PlayFabError();
                error.HttpCode = httpCode;
                error.HttpStatus = httpResponseString;
                error.Error = PlayFabErrorCode.UnknownError;
                error.ErrorMessage = "Failed to send a batch of events to OneDS";
                return error;
            }
            else
            {
                // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
                var error = new PlayFabError();
                error.HttpCode = httpCode;
                error.HttpStatus = httpResponseString;
                error.Error = PlayFabErrorCode.UnknownError;
                error.ErrorMessage = "Failed to send a batch of events to OneDS";
                return error;
            }
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
