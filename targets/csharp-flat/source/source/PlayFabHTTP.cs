using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    internal class PlayFabJsonError
    {
        public int code = 0;
        public string status = string.Empty;
        public string error = string.Empty;
        public int errorCode = 0;
        public string errorMessage = string.Empty;
        public Dictionary<string, string[]> errorDetails = null;

        [ThreadStatic]
        private static StringBuilder _tempSb;
        public string GenerateErrorReport()
        {
            if (_tempSb == null)
                _tempSb = new StringBuilder();
            _tempSb.Length = 0;
            _tempSb.Append(errorMessage);
            if (errorDetails != null)
                foreach (var pair in errorDetails)
                    foreach (var msg in pair.Value)
                        _tempSb.Append("\n").Append(pair.Key).Append(": ").Append(msg);
            return _tempSb.ToString();
        }
    }

    public class PlayFabException : Exception
    {
        public int HttpCode { get; private set; }
        public string HttpStatus { get; private set; }
        public PlayFabErrorCode Error { get; private set; }
        public Dictionary<string, string[] > ErrorDetails { get; private set; }

        internal PlayFabException(PlayFabJsonError jsonError)
            : base(jsonError.GenerateErrorReport())
        {
            HttpCode = jsonError.code;
            HttpStatus = jsonError.status;
            Error = (PlayFabErrorCode)jsonError.errorCode;
            ErrorDetails = jsonError.errorDetails;
        }

        internal PlayFabException(PlayFabErrorCode errorCode, string message)
            : base(message)
        {
            HttpCode = -1;
            HttpStatus = string.Empty;
            Error = errorCode;
            ErrorDetails = null;
        }
    }

    public class PlayFabHttpException : Exception
    {
        HttpStatusCode HttpCode { get; set; }

        internal PlayFabHttpException(HttpStatusCode code, string message)
            : base(message)
        {
            HttpCode = code;
        }
    }

    internal class PlayFabJsonSuccess<ResultT>
    {
        public int code = 0;
        public string status = string.Empty;
        public ResultT data = default(ResultT);
    }

    public static class PlayFabHTTP
    {
        private static HttpClient CreateClient(this PlayFabSettings settings)
        {
            HttpClient client = settings.MessageHandler == null 
                ? new HttpClient()
                : new HttpClient(settings.MessageHandler);

            if(settings.RequestTimeout.HasValue)
            {
                client.Timeout = settings.RequestTimeout.Value;
            }

            return client;
        }

        internal static async Task<string> DoPost(this PlayFabSettings settings, string apiName, string url, object request, string authType, string authKey)
        {
            string bodyString = null;
            var serializer = JsonSerializer.Create(settings.JsonSettings);
            
            if(request == null)
            {
                bodyString = "{}";
            }
            else if (request is string)
            {
                bodyString = (string)request;
            }
            else
            {
                StringWriter jsonString = new StringWriter();
                using(var writer = new JsonTextWriter(jsonString) { Formatting = settings.JsonFormatting })
                {
                    serializer.Serialize(writer, request);
                    bodyString = jsonString.ToString();
                }
            }

            if(settings.ApiCallback != null)
            {
                settings.ApiCallback(PlayFabApiEvent.SendingRequest, settings, apiName, "POST", url, bodyString);
            }

            HttpResponseMessage httpResponse = null;
            string httpResponseString = null;

            using(HttpClient client = settings.CreateClient())
            using(ByteArrayContent postBody = new ByteArrayContent(Encoding.UTF8.GetBytes(bodyString)))
            {
            
                postBody.Headers.Add("Content-Type", "application/json");
                if (authType != null)
                {
                    postBody.Headers.Add(authType, authKey);
                }
                postBody.Headers.Add("X-PlayFabSDK", PlayFabVersion.VersionString);

                httpResponse = await client.PostAsync(url, postBody);
                httpResponseString = await httpResponse.Content.ReadAsStringAsync();
            }

            if(settings.ApiCallback != null)
            {
                settings.ApiCallback(PlayFabApiEvent.ReceivedReply, settings, apiName, "POST", url, httpResponseString);
            }

            if(!httpResponse.IsSuccessStatusCode)
            {
                if (string.IsNullOrEmpty(httpResponseString) || httpResponse.StatusCode == HttpStatusCode.NotFound)
                {
                    throw new PlayFabHttpException(httpResponse.StatusCode, httpResponse.ReasonPhrase);
                }

                PlayFabJsonError errorResult = serializer.Deserialize<PlayFabJsonError>(new JsonTextReader(new StringReader(httpResponseString)));
                throw new PlayFabException(errorResult);
            }
            
            if(string.IsNullOrEmpty(httpResponseString))
            {
                throw new PlayFabException(PlayFabErrorCode.Unknown, "Internal server error");
            }

            return httpResponseString;
        }

        internal static async Task DoPut(this PlayFabSettings settings, string apiName, string url, string contentType, Stream data)
        {
            HttpResponseMessage httpResponse = null;

            if(settings.ApiCallback != null)
            {
                settings.ApiCallback(PlayFabApiEvent.SendingRequest, settings, apiName, "PUT", url, null);
            }

            using(HttpClient client = settings.CreateClient())
            using(StreamContent body = new StreamContent(data))
            {
            
                body.Headers.Add("Content-Type", contentType);

                httpResponse = await client.PutAsync(url, body);
                var httpResponseStream = await httpResponse.Content.ReadAsStreamAsync();
                bool hasData = true;
                var buffer = new byte[4096];
                do
                {
                    int read = await httpResponseStream.ReadAsync(buffer, 0, buffer.Length);
                    hasData = read != 0;
                } while (hasData);

                if(settings.ApiCallback != null)
                {
                    settings.ApiCallback(PlayFabApiEvent.ReceivedReply, settings, apiName, "PUT", url, null);
                }
            }

            if(!httpResponse.IsSuccessStatusCode)
            {
                throw new PlayFabHttpException(httpResponse.StatusCode, httpResponse.ReasonPhrase);
            }
        }    
    }
}
