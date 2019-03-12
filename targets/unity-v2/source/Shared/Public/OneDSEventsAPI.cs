#if NET_4_6
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
#if !UNITY_WSA && !UNITY_WP8
using Ionic.Zlib;
#endif
using Microsoft.Applications.Events;
using PlayFab.EventsModels;
using PlayFab.Internal;
using PlayFab.SharedModels;
using OneDSCsEvent = Microsoft.Applications.Events.DataModels.CsEvent;
using OneDSEventData = Microsoft.Applications.Events.DataModels.Data;

namespace PlayFab
{
    /// <summary>
    /// Main interface for OneDS (One Data Collector) events APIs.
    /// Write custom events to One Data Collector.
    /// </summary>
    public class OneDSEventsAPI
    {
        private string oneDSProjectIdIkey;
        private string oneDSIngestionKey;

        // "Tickets" are a special HTTP header in a POST request to OneDS server, e.g.:
        // Tickets: "<ticket1_key>": "<ticket1_prefix>:<ticket1_value>";"<ticket2_key>": "<ticket2_prefix>:<ticket2_value>";...
        // JWT token is provided as one of the tickets, e.g.:
        // Tickets: "<oneDSHeaderJwtTicketKey>": "<oneDSHeaderJwtTicketPrefix>:<oneDSJwtToken>"; ...
        private string oneDSJwtToken;
        private string oneDSHeaderJwtTicketKey;
        private string oneDSHeaderJwtTicketPrefix;

        public bool IsOneDSAuthenticated { get; private set; }

        public void SetCredentials(string projectIdIkey, string ingestionKey, string jwtToken, string headerJwtTicketKey, string headerJwtTicketPrefix)
        {
            this.oneDSProjectIdIkey = projectIdIkey;
            this.oneDSIngestionKey = ingestionKey;
            this.oneDSJwtToken = jwtToken;
            this.oneDSHeaderJwtTicketKey = headerJwtTicketKey;
            this.oneDSHeaderJwtTicketPrefix = headerJwtTicketPrefix;
            this.IsOneDSAuthenticated = true;
        }

        public void ForgetAllCredentials()
        {
            this.IsOneDSAuthenticated = false;
            this.oneDSProjectIdIkey = string.Empty;
            this.oneDSIngestionKey = string.Empty;
            this.oneDSJwtToken = string.Empty;
            this.oneDSHeaderJwtTicketKey = string.Empty;
            this.oneDSHeaderJwtTicketPrefix = string.Empty;
        }

        /// <summary>
        /// Write batches of custom events to OneDS (One Data Collector).
        /// The payload of custom events must be of OneDSEventData type.
        /// </summary>
        public async Task<PlayFabResult<WriteEventsResponse>> WriteTelemetryEventsAsync(WriteEventsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if (request.Events.Count == 0)
            {
                var apiMethodResult = new PlayFabResult<WriteEventsResponse>
                {
                    Error = new PlayFabError
                    {
                        Error = PlayFabErrorCode.ContentNotFound,
                        ErrorMessage = "No events found in request. Please make sure to provide at least one event in the batch.",
                        HttpStatus = "OneDSError"
                    },
                    CustomData = customData
                };

                return apiMethodResult;
            }

            if (!this.IsOneDSAuthenticated)
            {
                var apiMethodResult = new PlayFabResult<WriteEventsResponse>
                {
                    Error = new PlayFabError
                    {
                        Error = PlayFabErrorCode.AuthTokenDoesNotExist,
                        ErrorMessage = "OneDS API client is not authenticated. Please make sure OneDS credentials are set.",
                        HttpStatus = "OneDSError"
                    },
                    CustomData = customData
                };

                return apiMethodResult;
            }

            // get transport plugin for OneDS
            var transport = PluginManager.GetPlugin<IOneDSTransportPlugin>(PluginContract.PlayFab_Transport, PluginManager.PLUGIN_TRANSPORT_ONEDS);

            // compose batch using One Collector's Common Schema 3.0
            byte[] serializedBatch;
            using (var ms = new MemoryStream())
            {
                foreach (var eventContents in request.Events)
                {
                    var csEvent = new OneDSCsEvent();
                    csEvent.data = new List<OneDSEventData>();
                    var data = eventContents.Payload as OneDSEventData;
                    if (data != null)
                    {
                        csEvent.data.Add(data);
                    }

                    csEvent.name = eventContents.Name;

                    csEvent.iKey = this.oneDSProjectIdIkey;
                    csEvent.time = DateTime.UtcNow.Ticks;
                    csEvent.ver = "3.0";
                    csEvent.baseType = string.Empty;
                    csEvent.flags = 1;

                    // serialize CS 3.0 event using bond
                    BondHelper.Serialize(csEvent, ms);
                }

#if !UNITY_WSA && !UNITY_WP8 && !UNITY_WEBGL
                ms.Position = 0;
                byte[] packageBytes = ms.ToArray();
                ms.SetLength(0);

                // Gzip content
                using (var gZipStream = new GZipStream(ms, CompressionMode.Compress, true))
                {
                    gZipStream.Write(packageBytes, 0, packageBytes.Length);
                }
#endif

                serializedBatch = ms.ToArray();
            }

            // send serialized binary content of batch
            var headers = new Dictionary<string, string>();
            headers["APIKey"] = this.oneDSIngestionKey;
            headers["Tickets"] = "\"" + oneDSHeaderJwtTicketKey + "\": \"" + oneDSHeaderJwtTicketPrefix + ":" + oneDSJwtToken + "\"";
            if (extraHeaders != null)
            {
                foreach (var extraHeader in extraHeaders)
                {
                    headers.Add(extraHeader.Key, extraHeader.Value);
                }
            }

            PlayFabResult<WriteEventsResponse> result = null;
            transport.DoPost(serializedBatch, headers, httpResult =>
            {
                if (httpResult is PlayFabError)
                {
                    var error = (PlayFabError)httpResult;
                    result = new PlayFabResult<WriteEventsResponse> { Error = error, CustomData = customData };
                    return;
                }
                result = new PlayFabResult<WriteEventsResponse>{ Result = new WriteEventsResponse(), CustomData = customData };
            });

            await WaitWhile(() => result == null, 100);
            
            return result;
        }

        /// <summary>
        /// This is an internal API for PlayFab SDK to get Ingestion Config that enables telemetry ingestion.
        /// </summary>
        internal static async Task<PlayFabResult<TelemetryIngestionConfigResponse>> GetTelemetryIngestionConfigAsync(TelemetryIngestionConfigRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            var transport = PluginManager.GetPlugin<IPlayFabTransportPlugin>(PluginContract.PlayFab_Transport);
            if (transport.EntityToken == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            PlayFabResult<TelemetryIngestionConfigResponse> result = null;
            
            PlayFabHttp.instance.InjectInUnityThread(() =>
            {
                PlayFabHttp.MakeApiCall<TelemetryIngestionConfigResponse>("/Event/GetTelemetryIngestionConfig", request, AuthType.EntityToken, callback =>
                {
                    result = new PlayFabResult<TelemetryIngestionConfigResponse> {Result = callback, CustomData = customData};
                },
                error =>
                {
                    result = new PlayFabResult<TelemetryIngestionConfigResponse>{Error = error, CustomData = customData};
                });    
            });

            await WaitWhile(() => result == null, 100);
            return result;
        }
        
        public static async Task WaitWhile(Func<bool> condition, int frequency = 25, int timeout = -1)
        {
            var waitTask = Task.Run(async () =>
            {
                while (condition()) await Task.Delay(frequency);
            });

            if(waitTask != await Task.WhenAny(waitTask, Task.Delay(timeout)))
                throw new TimeoutException();
        }
    }
}
#endif