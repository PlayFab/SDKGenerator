#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using EventsModels;
    using Internal;
    using MultiplayerModels;

    public class PlayFabQosApi
    {
        private const int DefaultTimeoutMs = 250;
        private readonly Dictionary<AzureRegion, string> _dataCenterMap = new Dictionary<AzureRegion, string>();

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
                result.ErrorCode = (int)QosErrorCode.NotLoggedIn;
                result.ErrorMessage = "Client is not logged in";
                return result;
            }

            // get datacenter map (call thunderhead)
            await InitializeQoSServerList();

            int serverCount = _dataCenterMap.Count;
            if (serverCount <= 0)
            {
                result.ErrorCode = (int)QosErrorCode.FailedToRetrieveServerList;
                result.ErrorMessage = "Failed to get server list from PlayFab multiplayer servers";
                return result;
            }

            // ping servers
            result.RegionResults = await GetSortedRegionLatencies(timeoutMs);
            result.ErrorCode = (int)QosErrorCode.Success;
            return result;
        }

        private async Task InitializeQoSServerList()
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
            var asyncPingResults = new List<Task<QosRegionResult>>(_dataCenterMap.Count);
            foreach (KeyValuePair<AzureRegion, string> datacenter in _dataCenterMap)
            {
                var regionPinger = new RegionPinger(datacenter.Value, datacenter.Key);
                Task<QosRegionResult> pingResult = regionPinger.PingAsync(timeoutMs);
                asyncPingResults.Add(pingResult);
            }

            await Task.WhenAll(asyncPingResults);
            var results = new List<QosRegionResult>(asyncPingResults.Count);
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
                Payload = QosResultFacade.CreateFrom(result)
            };

            var writeEventsRequest = new WriteEventsRequest
            {
                Events = new List<EventContents> {eventContents}
            };

            await WriteTelemetryAsync(writeEventsRequest);
        }

        private static async Task<PlayFabResult<WriteEventsResponse>> WriteTelemetryAsync(WriteEventsRequest request, object customData = null, Dictionary<string, string> extraHeaders = null)
        {
            if ((request?.AuthenticationContext?.EntityToken ?? PlayFabSettings.staticPlayer.EntityToken) == null) throw new PlayFabException(PlayFabExceptionCode.EntityTokenNotSet, "Must call GetEntityToken before calling this method");

            var httpResult = await PlayFabHttp.DoPost("/Event/WriteTelemetryEvents", request, "X-EntityToken", PlayFabSettings.staticPlayer.EntityToken, extraHeaders);
            if (httpResult is PlayFabError)
            {
                var error = (PlayFabError)httpResult;
                return new PlayFabResult<WriteEventsResponse> { Error = error, CustomData = customData };
            }

            var resultRawJson = (string)httpResult;
            var resultData = PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer).DeserializeObject<PlayFabJsonSuccess<WriteEventsResponse>>(resultRawJson);
            var result = resultData.data;

            return new PlayFabResult<WriteEventsResponse> { Result = result, CustomData = customData };
        }
    }
}
#endif
