using System;

namespace PlayFab.Internal
{
    public static class OneDsUtility
    {
        // public const string ONEDS_SERVICE_URL = "https://mobile.events.data.microsoft.com/OneCollector/1.0/";
        public const string ONEDS_SERVICE_URL = "https://self.events.data.microsoft.com/OneCollector/1.0/";

        public static void ParseResponse(long httpCode, Func<string> getText, string errorString, Action<object> callback)
        {
            if (callback == null) return;

            if (!string.IsNullOrEmpty(errorString))
            {
                callback.Invoke(new OneDsError
                {
                    Error = PlayFabErrorCode.Unknown,
                    ErrorMessage = errorString
                });
            }
            else
            {
                string httpResponseString;

                try
                {
                    httpResponseString = getText.Invoke();
                }
                catch (Exception exception)
                {
                    callback.Invoke(new OneDsError
                    {
                        Error = PlayFabErrorCode.ConnectionError,
                        ErrorMessage = exception.Message
                    });
                    return;
                }

                if (httpCode >= 200 && httpCode < 300)
                {
                    Action<Exception> printErrorMessage = e =>
                    {
                        var errorMsg = string.Format("Exception in callback method. Source: {0}, Error: {1}", e.Source, e.Message);
                        UnityEngine.Debug.LogException(new Exception(errorMsg));
                    };
                    
                    var responseObj = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject(httpResponseString) as Json.JsonObject;
                    ulong oneDsResult = 0;

                    try
                    {
                        oneDsResult = ulong.Parse(responseObj["acc"].ToString());
                    }
                    catch (NullReferenceException e)
                    {
                        callback.Invoke(new OneDsError
                        {
                            HttpCode = (int) httpCode,
                            HttpStatus = httpResponseString,
                            Error = PlayFabErrorCode.JsonParseError,
                            ErrorMessage = "Failed to parse response from OneDS server: " + e.Message
                        });

                        return;
                    }
                    catch (Exception e)
                    {
                        printErrorMessage.Invoke(e);
                        return;
                    }

                    try
                    {
                        if (oneDsResult > 0)
                        {
                            callback.Invoke(httpResponseString);
                        }
                        else
                        {
                            callback.Invoke(new OneDsError
                            {
                                HttpCode = (int) httpCode,
                                HttpStatus = httpResponseString,
                                Error = PlayFabErrorCode.PartialFailure,
                                ErrorMessage = "OneDS server did not accept events"
                            });
                        }
                    }
                    catch (Exception e)
                    {
                        printErrorMessage.Invoke(e);
                    }
                }
                else if ((httpCode >= 500 && httpCode != 501 && httpCode != 505) || httpCode == 408 || httpCode == 429)
                {
                    // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
                    // are eligible for retries

                    // TODO implement a retry policy
                    // As a placeholder, return an immediate error

                    callback.Invoke(new OneDsError
                    {
                        HttpCode = (int) httpCode,
                        HttpStatus = httpResponseString,
                        Error = PlayFabErrorCode.UnknownError,
                        ErrorMessage = "Failed to send a batch of events to OneDS"
                    });
                }
                else
                {
                    // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
                    callback.Invoke(new OneDsError
                    {
                        HttpCode = (int) httpCode,
                        HttpStatus = httpResponseString,
                        Error = PlayFabErrorCode.UnknownError,
                        ErrorMessage = "Failed to send a batch of events to OneDS"
                    });
                }
            }
        }
    }

    public class OneDsError 
    {
        public int HttpCode;
        public string HttpStatus;
        public PlayFabErrorCode Error;
        public string ErrorMessage;
    }
}
