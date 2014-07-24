using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace PlayFab.Internal
{
    public class PlayFabJsonError
    {
        public int code;
        public string status;
        public string error;
        public int errorCode;
        public string errorMessage;
        public Dictionary<string, string[]> errorDetails = null;
    }

    public class PlayFabJsonSuccess<ResultT>
    {
        public int code;
        public string status;
        public ResultT data;
    }

    public class PlayFabHTTP
    {
        public static async Task<object> DoPost(string url, object request, string authType, string authKey)
        {
            string bodyString = null;
			var serializer = JsonSerializer.Create(PlayFabSettings.JsonSettings);
			
            if(request == null)
            {
                bodyString = "{}";
            }
            else if (request is String)
            {
                bodyString = (String)request;
            }
            else
            {
                StringWriter jsonString = new StringWriter();
                var writer = new JsonTextWriter(jsonString) { Formatting = PlayFabSettings.JsonFormatting };
                serializer.Serialize(writer, request);
                bodyString = jsonString.ToString();
            }

            HttpClient client = new HttpClient();
            ByteArrayContent postBody = new ByteArrayContent(Encoding.UTF8.GetBytes(bodyString));
            postBody.Headers.Add("Content-Type", "application/json");
            if (authType != null)
                postBody.Headers.Add(authType, authKey);
            postBody.Headers.Add("X-PlayFabSDK", PlayFabVersion.getVersionString());

            HttpResponseMessage httpResponse = null;
            String httpResponseString = null;
            try
            {
                httpResponse = await client.PostAsync(url, postBody);
                httpResponseString = await httpResponse.Content.ReadAsStringAsync();
            }
            catch (HttpRequestException e)
            {
                PlayFabError error = new PlayFabError();
                error.Error = PlayFabErrorCode.ConnectionError;
                error.ErrorMessage = e.InnerException.Message;
                return error;
            }
            catch (Exception e)
            {
                PlayFabError error = new PlayFabError();
                error.Error = PlayFabErrorCode.ConnectionError;
                error.ErrorMessage = e.Message;
                return error;
            }

            if(!httpResponse.IsSuccessStatusCode)
            {
                PlayFabError error = new PlayFabError();

                if (String.IsNullOrEmpty(httpResponseString)|| httpResponse.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    error.HttpCode = (int)httpResponse.StatusCode;
                    error.HttpStatus = httpResponse.StatusCode.ToString();
                    return error;
                }
  

                PlayFabJsonError errorResult = null;
                try
                {
                    errorResult = serializer.Deserialize<PlayFabJsonError>(new JsonTextReader(new StringReader(httpResponseString)));
                }
                catch(Exception e)
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

            return httpResponseString;
        }
    }
}
