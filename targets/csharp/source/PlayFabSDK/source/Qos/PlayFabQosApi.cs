#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using EventsModels;
    using MultiplayerModels;
    using System.Collections.Generic;
    using System.Threading.Tasks;

    public class PlayFabQosApi
    {
        private const int DefaultTimeoutMs = 250;
        private readonly Dictionary<string, string> _dataCenterMap = new Dictionary<string, string>();
        private readonly PlayFabMultiplayerInstanceAPI multiplayerApi = new PlayFabMultiplayerInstanceAPI(PlayFabSettings.staticPlayer);
        private readonly PlayFabEventsInstanceAPI eventsApi = new PlayFabEventsInstanceAPI(PlayFabSettings.staticPlayer);

#pragma warning disable 4014
        public async Task<QosResult> GetQosResultAsync(int timeoutMs = DefaultTimeoutMs)
        {
            await new PlayFabUtil.SynchronizationContextRemover();

            QosResult result = await GetResultAsync(timeoutMs);
            if (result.ErrorCode != (int)QosErrorCode.Success)
            {
                return result;
            }

            Task.Factory.StartNew(() => SendResultsToPlayFab(result));
            return result;
        }
#pragma warning restore 4014

        private async Task<QosResult> GetResultAsync(int timeoutMs)
        {
            var result = new QosResult();

            if (!PlayFabSettings.staticPlayer.IsClientLoggedIn())
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
            PlayFabResult<ListQosServersResponse> response = await multiplayerApi.ListQosServersAsync(request);

            if (response == null || response.Error != null)
            {
                return;
            }

            foreach (QosServer qosServer in response.Result.QosServers)
            {
                if (string.IsNullOrEmpty(qosServer.Region))
                {
                    continue;
                }

                _dataCenterMap[qosServer.Region] = qosServer.ServerUrl;
            }
        }

        private async Task<List<QosRegionResult>> GetSortedRegionLatencies(int timeoutMs)
        {
            var asyncPingResults = new List<Task<QosRegionResult>>(_dataCenterMap.Count);
            foreach (KeyValuePair<string, string> datacenter in _dataCenterMap)
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

            results.Sort((x, y) => x.LatencyMs.CompareTo(y.LatencyMs));

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
                Events = new List<EventContents> { eventContents }
            };

            await eventsApi.WriteTelemetryEventsAsync(writeEventsRequest);
        }
    }
}

#endif
