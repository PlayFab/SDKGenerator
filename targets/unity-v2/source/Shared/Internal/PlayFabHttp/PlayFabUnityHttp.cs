#if UNITY_2017_2_OR_NEWER
using PlayFab.Json;
using PlayFab.SharedModels;
using System;
using System.Collections;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace PlayFab.Internal
{
    public class PlayFabUnityHttp : IPlayFabHttp
    {
        private readonly int _pendingWwwMessages = 0;

        public bool SessionStarted { get; set; }
        public string AuthKey { get; set; }
        public string EntityToken { get; set; }

        public void InitializeHttp() { }

        public void Update() { }

        public void OnDestroy() { }

        public void SimpleGetCall(string fullUrl, Action<byte[]> successCallback, Action<string> errorCallback)
        {
            PlayFabHttp.instance.StartCoroutine(SimpleCallCoroutine(fullUrl, null, successCallback, errorCallback));
        }

        public void SimplePutCall(string fullUrl, byte[] payload, Action successCallback, Action<string> errorCallback)
        {
            PlayFabHttp.instance.StartCoroutine(SimpleCallCoroutine(fullUrl, payload, (result) => { successCallback(); }, errorCallback));
        }

        private static IEnumerator SimpleCallCoroutine(string fullUrl, byte[] payload, Action<byte[]> successCallback, Action<string> errorCallback)
        {
            if (payload == null)
            {
                var www = new UnityWebRequest(fullUrl)
                {
                    downloadHandler = new DownloadHandlerBuffer(),
                    method = "POST"
                };
                yield return www;
                if (!string.IsNullOrEmpty(www.error))
                    errorCallback(www.error);
                else
                    successCallback(www.downloadHandler.data);
            }
            else
            {
                var putRequest = UnityWebRequest.Put(fullUrl, payload);
#if UNITY_2017_2_OR_NEWER
                putRequest.SendWebRequest();
#else
                putRequest.Send();
#endif
                while (putRequest.uploadProgress < 1 && putRequest.downloadProgress < 1)
                    yield return 1;
                if (!string.IsNullOrEmpty(putRequest.error))
                    errorCallback(putRequest.error);
                else
                    successCallback(null);
            }
        }

        public void MakeApiCall(CallRequestContainer reqContainer)
        {
            reqContainer.RequestHeaders["Content-Type"] = "application/json";

#if !UNITY_WSA && !UNITY_WP8 && !UNITY_WEBGL
            if (PlayFabSettings.CompressApiData)
            {
                reqContainer.RequestHeaders["Content-Encoding"] = "GZIP";
                reqContainer.RequestHeaders["Accept-Encoding"] = "GZIP";

                using (var stream = new MemoryStream())
                {
                    using (var zipstream = new Ionic.Zlib.GZipStream(stream, Ionic.Zlib.CompressionMode.Compress,
                        Ionic.Zlib.CompressionLevel.BestCompression))
                    {
                        zipstream.Write(reqContainer.Payload, 0, reqContainer.Payload.Length);
                    }
                    reqContainer.Payload = stream.ToArray();
                }
            }
#endif

            // Start the www corouting to Post, and get a response or error which is then passed to the callbacks.
            PlayFabHttp.instance.StartCoroutine(Post(reqContainer));
        }

        private IEnumerator Post(CallRequestContainer reqContainer)
        {
#if PLAYFAB_REQUEST_TIMING
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var startTime = DateTime.UtcNow;
#endif

            var www = new UnityWebRequest(reqContainer.FullUrl)
            {
                uploadHandler = new UploadHandlerRaw(reqContainer.Payload),
                downloadHandler = new DownloadHandlerBuffer(),
                method = "POST"
            };

            foreach (var headerPair in reqContainer.RequestHeaders)
            {
                if (!string.IsNullOrEmpty(headerPair.Key) && !string.IsNullOrEmpty(headerPair.Value))
                    www.SetRequestHeader(headerPair.Key, headerPair.Value);
                else
                    Debug.LogWarning("Null header: " + headerPair.Key + " = " + headerPair.Value);
            }

#if UNITY_2017_2_OR_NEWER
            yield return www.SendWebRequest();
#else
            yield return www.Send();
#endif

#if PLAYFAB_REQUEST_TIMING
            stopwatch.Stop();
            var timing = new PlayFabHttp.RequestTiming {
                StartTimeUtc = startTime,
                ApiEndpoint = reqContainer.ApiEndpoint,
                WorkerRequestMs = (int)stopwatch.ElapsedMilliseconds,
                MainThreadRequestMs = (int)stopwatch.ElapsedMilliseconds
            };
            PlayFabHttp.SendRequestTiming(timing);
#endif

            if (!string.IsNullOrEmpty(www.error))
            {
                OnError(www.error, reqContainer);
            }
            else
            {
                try
                {
                    byte[] responseBytes = www.downloadHandler.data;
                    bool isGzipCompressed = responseBytes != null && responseBytes[0] == 31 && responseBytes[1] == 139;
                    string responseText = "Unexpected error: cannot decompress GZIP stream.";
                    if (!isGzipCompressed && responseBytes != null)
                        responseText = System.Text.Encoding.UTF8.GetString(responseBytes, 0, responseBytes.Length);
#if !UNITY_WSA && !UNITY_WP8 && !UNITY_WEBGL
                    if (isGzipCompressed)
                    {
                        var stream = new MemoryStream(responseBytes);
                        using (var gZipStream = new Ionic.Zlib.GZipStream(stream, Ionic.Zlib.CompressionMode.Decompress, false))
                        {
                            var buffer = new byte[4096];
                            using (var output = new MemoryStream())
                            {
                                int read;
                                while ((read = gZipStream.Read(buffer, 0, buffer.Length)) > 0)
                                    output.Write(buffer, 0, read);
                                output.Seek(0, SeekOrigin.Begin);
                                var streamReader = new StreamReader(output);
                                var jsonResponse = streamReader.ReadToEnd();
                                //Debug.Log(jsonResponse);
                                OnResponse(jsonResponse, reqContainer);
                                //Debug.Log("Successful UnityHttp decompress for: " + www.url);
                            }
                        }
                    }
                    else
#endif
                    {
                        OnResponse(responseText, reqContainer);
                    }
                }
                catch (Exception e)
                {
                    OnError("Unhandled error in PlayFabUnityHttp: " + e, reqContainer);
                }
            }
            www.Dispose();
        }

        public int GetPendingMessages()
        {
            return _pendingWwwMessages;
        }

        public void OnResponse(string response, CallRequestContainer reqContainer)
        {
            try
            {
#if PLAYFAB_REQUEST_TIMING
                var startTime = DateTime.UtcNow;
#endif
                var httpResult = JsonWrapper.DeserializeObject<HttpResponseObject>(response);

                if (httpResult.code == 200)
                {
                    // We have a good response from the server
                    reqContainer.JsonResponse = JsonWrapper.SerializeObject(httpResult.data);
                    reqContainer.DeserializeResultJson();
                    reqContainer.ApiResult.Request = reqContainer.ApiRequest;
                    reqContainer.ApiResult.CustomData = reqContainer.CustomData;

                    PlayFabHttp.instance.OnPlayFabApiResult(reqContainer.ApiResult);
#if !DISABLE_PLAYFABCLIENT_API
                    PlayFabDeviceUtil.OnPlayFabLogin(reqContainer.ApiResult);
#endif
                    try
                    {
                        PlayFabHttp.SendEvent(reqContainer.ApiEndpoint, reqContainer.ApiRequest, reqContainer.ApiResult,
                            ApiProcessingEventType.Post);
                    }
                    catch (Exception e)
                    {
                        Debug.LogException(e);
                    }

                    try
                    {
                        reqContainer.InvokeSuccessCallback();
                    }
                    catch (Exception e)
                    {
                        Debug.LogException(e);
                    }
                }
                else
                {
                    if (reqContainer.ErrorCallback != null)
                    {
                        reqContainer.Error = PlayFabHttp.GeneratePlayFabError(reqContainer.ApiEndpoint, response, reqContainer.CustomData);
                        PlayFabHttp.SendErrorEvent(reqContainer.ApiRequest, reqContainer.Error);
                        reqContainer.ErrorCallback(reqContainer.Error);
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
        }

        public void OnError(string error, CallRequestContainer reqContainer)
        {
            reqContainer.JsonResponse = error;
            if (reqContainer.ErrorCallback != null)
            {
                reqContainer.Error = PlayFabHttp.GeneratePlayFabError(reqContainer.ApiEndpoint, reqContainer.JsonResponse, reqContainer.CustomData);
                PlayFabHttp.SendErrorEvent(reqContainer.ApiRequest, reqContainer.Error);
                reqContainer.ErrorCallback(reqContainer.Error);
            }
        }
    }
}
#endif
