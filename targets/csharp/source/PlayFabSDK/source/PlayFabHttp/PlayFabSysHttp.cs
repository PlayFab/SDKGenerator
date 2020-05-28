using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public class PlayFabSysHttp : ITransportPlugin
    {
        private readonly HttpClient _client = new HttpClient();

        public async Task<object> DoPost(string fullUrl, object request, Dictionary<string, string> extraHeaders)
        {
            await new PlayFabUtil.SynchronizationContextRemover();

            var serializer = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
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
            IEnumerable<string> requestId;
            bool hasReqId = false;
            const string defaultReqId = "NoRequestIdFound";
            using (var postBody = new ByteArrayContent(Encoding.UTF8.GetBytes(bodyString)))
            {
                postBody.Headers.Add("Content-Type", "application/json");
                postBody.Headers.Add("X-PlayFabSDK", PlayFabSettings.SdkVersionString);
                if (extraHeaders != null)
                {
                    foreach (var headerPair in extraHeaders)
                    {
                        // Special case for Authorization header
                        if (headerPair.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                        {
                            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", headerPair.Value);
                        }
                        else
                        {
                            postBody.Headers.Add(headerPair.Key, headerPair.Value);
                        }
                    }
                }

                try
                {
                    httpResponse = await _client.PostAsync(fullUrl, postBody);
                    httpResponseString = await httpResponse.Content.ReadAsStringAsync();
                    hasReqId = httpResponse.Headers.TryGetValues("X-RequestId", out requestId);
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

                if (string.IsNullOrEmpty(httpResponseString))
                {
                    error.HttpCode = (int)httpResponse.StatusCode;
                    error.HttpStatus = httpResponse.StatusCode.ToString();
                    error.RequestId = hasReqId ? requestId.ElementAt(0) : defaultReqId;
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
                    error.RequestId = hasReqId ? requestId.ElementAt(0) : defaultReqId;
                    return error;
                }

                error.HttpCode = errorResult.code;
                error.HttpStatus = errorResult.status;
                error.Error = (PlayFabErrorCode)errorResult.errorCode;
                error.ErrorMessage = errorResult.errorMessage;

                if (errorResult.errorDetails != null)
                {
                    error.ErrorDetails = new Dictionary<string, string[]>();
                    foreach (var detail in errorResult.errorDetails)
                    {
                        error.ErrorDetails.Add(detail.Key, detail.Value);
                    }
                }

                error.RequestId = hasReqId ? requestId.ElementAt(0) : defaultReqId;

                return error;
            }

            if (string.IsNullOrEmpty(httpResponseString))
            {
                return new PlayFabError
                {
                    Error = PlayFabErrorCode.Unknown,
                    ErrorMessage = "Internal server error",
                    RequestId = hasReqId ? requestId.ElementAt(0) : defaultReqId
                };
            }

            return httpResponseString;
        }
    }
}
