namespace PlayFab.QoS
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using EventsModels;
    using Internal;
    using MultiplayerModels;

    public class PlayFabQosApi
    {
        private const int DefaultTimeoutMs = 250;
        private readonly Dictionary<AzureRegion, string> _dataCenterMap = new Dictionary<AzureRegion, string>();
        private readonly Action<string> _logAction;

        public PlayFabQosApi(Action<string> logAction = null)
        {
            _logAction = logAction;
        }

        public async Task<QosResult> GetQosResultAsync(int timeoutMs = DefaultTimeoutMs)
        {
            QosResult result = await GetResultAsync(timeoutMs);
            if (result.ErrorCode != (int)QosErrorCode.Success)
            {
                return result;
            }

            Task.Factory.StartNew(() => SendResultsToPlayFab(result));
            return result;
        }

        private async Task<QosResult> GetResultAsync(int timeoutMs)
        {
            var result = new QosResult();

            if (!PlayFabClientAPI.IsClientLoggedIn())
            {
                LogQos("Client is not logged in");
                result.ErrorCode = (int)QosErrorCode.NotLoggedIn;
                return result;
            }

            // get datacenter map (call thunderhead)
            await GetQoSServerList();

            int serverCount = _dataCenterMap.Count;
            if (serverCount <= 0)
            {
                result.ErrorCode = (int)QosErrorCode.FailedToRetrieveServerList;
                return result;
            }

            // ping servers
            result.RegionResults = await GetSortedRegionLatencies(timeoutMs);
            result.ErrorCode = (int)QosErrorCode.Success;
            return result;
        }

        private async Task GetQoSServerList()
        {
            if (_dataCenterMap.Count > 0)
            {
                // If the dataCenterMap is already initialized, return
                return;
            }

            var request = new ListQosServersRequest();
            PlayFabResult<ListQosServersResponse> response = await PlayFabMultiplayerAPI.ListQosServersAsync(request);
            
            if (response == null || response.Error != null)
            {
                LogQos("Could not get the server list from thunderhead\n Error : " + response?.Error.GenerateErrorReport());
                return;
            }

            foreach (QosServer qosServer in response.Result.QosServers)
            {
                if (!qosServer.Region.HasValue)
                {
                    continue;
                }

                _dataCenterMap[qosServer.Region.Value] = qosServer.ServerUrl;
            }
        }

        private async Task<List<QosRegionResult>> GetSortedRegionLatencies(int timeoutMs)
        {
            List<Task<QosRegionResult>> asyncPingResults = _dataCenterMap.Select(async kvp =>
            {
                var regionPinger = new RegionPinger(kvp.Value, kvp.Key);
                return await regionPinger.PingAsync(timeoutMs);
            }).ToList();

            await Task.WhenAll(asyncPingResults);
            List<QosRegionResult> results = new List<QosRegionResult>(asyncPingResults.Count);
            foreach (Task<QosRegionResult> asyncPingResult in asyncPingResults)
            {
                results.Add(asyncPingResult.Result);
            }

            results.Sort((x,y) => x.LatencyMs.CompareTo(y.LatencyMs));

            return results;
        }

        private async Task SendResultsToPlayFab(QosResult result)
        {
            var eventContents = new EventContents
            {
                Name = "qos_result",
                EventNamespace = "playfab.servers",
                Payload = result
            };

            var writeEventsRequest = new WriteEventsRequest
            {
                Events = new List<EventContents> {eventContents}
            };

            PlayFabResult<WriteEventsResponse> response = null;
            try
            {
                response = await WriteTelemetryAsync(writeEventsRequest);
            }
            catch (Exception exception)
            {
                LogQos(exception.ToString());
            }

            if (response == null || response.Error != null)
            {
                LogQos(response?.Error.GenerateErrorReport());
            }
        }

        private static async Task<PlayFabResult<WriteEventsResponse>> WriteTelemetryAsync(WriteEventsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if ((request?.AuthenticationContext?.EntityToken ?? PlayFabSettings.staticPlayer.EntityToken) == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabHttp.DoPost("/Event/WriteTelemetryEvents", request, "X-EntityToken", PlayFabSettings.staticPlayer.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                PlayFabSettings.GlobalErrorHandler?.Invoke(error);
                return new PlayFabResult<WriteEventsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject<PlayFabJsonSuccess<WriteEventsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<WriteEventsResponse> { Result = result, CustomData = customData };
        }

        private void LogQos(string message)
        {
            _logAction?.Invoke(message);
        }
    }
}
