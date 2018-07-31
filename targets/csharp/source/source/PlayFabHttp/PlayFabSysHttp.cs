#if !NETFX_CORE || !XAMARIN

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public class PlayFabSysHttp : ITransportPlugin
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

            HttpResponseMessage httpResponse;
            string httpResponseString;
            using (var postBody = new ByteArrayContent(Encoding.UTF8.GetBytes(bodyString)))
            {
                postBody.Headers.Add("Content-Type", "application/json");
                postBody.Headers.Add("X-PlayFabSDK", PlayFabSettings.SdkVersionString);
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
