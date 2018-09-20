#if NETFX_CORE && XAMARIN

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Windows.Web.Http;

namespace PlayFab.Internal
{
    public class PlayFabWinHttp : ITransportPlugin
    {
        private readonly HttpClient _client = new HttpClient();

        public async Task<object> DoPost(string urlPath, object request, Dictionary<string, string> extraHeaders)
        {
            var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
            var fullUrl = PlayFabSettings.GetFullUrl(urlPath, PlayFabSettings.RequestGetParams);
            string bodyString;

            if (request == null)
            {
                bodyString = "{}";
            }
            else
            {
                bodyString = serializer.SerializeObject(request);
            }

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, new Uri(fullUrl));
            requestMessage.Content = new HttpStringContent(bodyString, Windows.Storage.Streams.UnicodeEncoding.Utf8, "application/json");
            requestMessage.Headers.Add(new KeyValuePair<string, string>("X-PlayFabSDK", PlayFabSettings.SdkVersionString));
            if (extraHeaders != null)
                foreach (var headerPair in extraHeaders)
                    requestMessage.Headers.Add(headerPair);

            HttpResponseMessage httpResponse;
            string httpResponseString;
            try
            {
                httpResponse = await _client.SendRequestAsync(requestMessage);
                httpResponseString = await httpResponse.Content.ReadAsStringAsync();
            }
            catch (Exception e)
            {
                return new PlayFabError
                {
                    Error = PlayFabErrorCode.ConnectionError,
                    ErrorMessage = e.Message
                };
            }

            if (!httpResponse.IsSuccessStatusCode)
            {
                var error = new PlayFabError();

                if (string.IsNullOrEmpty(httpResponseString))
                {
                    error.HttpCode = (int)httpResponse.StatusCode;
                    error.HttpStatus = httpResponse.StatusCode.ToString();
                    return error;
                }

                PlayFabJsonError errorResult;
                try
                {
                    errorResult = serializer.DeserializeObject<PlayFabJsonError>(httpResponseString);
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
    }
}
#endif
