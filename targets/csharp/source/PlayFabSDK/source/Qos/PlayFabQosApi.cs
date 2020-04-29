#if !DISABLE_PLAYFABCLIENT_API && !DISABLE_PLAYFABENTITY_API
namespace PlayFab.QoS
{
    using EventsModels;
    using MultiplayerModels;
    using System;
    using System.Collections.Concurrent;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;

    public class PlayFabQosApi
    {
        private readonly PlayFabAuthenticationContext _authContext;
        private const int DefaultPingsPerRegion = 10;
        private const int DefaultDegreeOfParallelism = 4;
        private const int NumTimeoutsForError = 3;
        private const int DefaultTimeoutMs = 250;

        private readonly PlayFabMultiplayerInstanceAPI multiplayerApi;
        private readonly PlayFabEventsInstanceAPI eventsApi;

        private readonly Func<object, Task> qosResultsReporter;

        private Dictionary<string, string> _dataCenterMap;

        private bool _reportResults;

        public PlayFabQosApi(PlayFabApiSettings settings = null, PlayFabAuthenticationContext authContext = null, bool reportResults = true)
        {
            _authContext = authContext ?? PlayFabSettings.staticPlayer;

            multiplayerApi = new PlayFabMultiplayerInstanceAPI(settings, _authContext);
            eventsApi = new PlayFabEventsInstanceAPI(settings, _authContext);
            qosResultsReporter = SendSuccessfulQosResultsToPlayFab;
            _reportResults = reportResults;
        }

#pragma warning disable 4014
        public async Task<QosResult> GetQosResultAsync(
            int timeoutMs = DefaultTimeoutMs,
            int pingsPerRegion = DefaultPingsPerRegion,
            int degreeOfParallelism = DefaultDegreeOfParallelism)
        {
            await new PlayFabUtil.SynchronizationContextRemover();

            QosResult result = await GetResultAsync(timeoutMs, pingsPerRegion, degreeOfParallelism);
            if (result.ErrorCode != (int)QosErrorCode.Success)
            {
                return result;
            }

            if (_reportResults)
            {
                Task.Factory.StartNew(qosResultsReporter, result).Unwrap();
            }

            return result;
        }
#pragma warning restore 4014

        private async Task<QosResult> GetResultAsync(int timeoutMs, int pingsPerRegion, int degreeOfParallelism)
        {
            if (!_authContext.IsClientLoggedIn())
            {
                return new QosResult
                {
                    ErrorCode = (int)QosErrorCode.NotLoggedIn,
                    ErrorMessage = "Client is not logged in"
                };
            }

            Dictionary<string, string> dataCenterMap = await GetQoSServerList();

            if (dataCenterMap == null || dataCenterMap.Count == 0)
            {
                return new QosResult
                {
                    ErrorCode = (int)QosErrorCode.FailedToRetrieveServerList,
                    ErrorMessage = "Failed to get server list from PlayFab multiplayer servers"
                };
            }

            return await GetSortedRegionLatencies(timeoutMs, dataCenterMap, pingsPerRegion, degreeOfParallelism);
        }

        private async Task<Dictionary<string, string>> GetQoSServerList()
        {
            if (_dataCenterMap?.Count > 0)
            {
                // If the dataCenterMap is already initialized, return
                return _dataCenterMap;
            }

            var request = new ListQosServersForTitleRequest();
            PlayFabResult<ListQosServersForTitleResponse> response = await multiplayerApi.ListQosServersForTitleAsync(request);

            if (response == null || response.Error != null)
            {
                return null;
            }

            var dataCenterMap = new Dictionary<string, string>(response.Result.QosServers.Count);

            foreach (QosServer qosServer in response.Result.QosServers)
            {
                if (!string.IsNullOrEmpty(qosServer.Region))
                {
                    dataCenterMap[qosServer.Region] = qosServer.ServerUrl;
                }
            }

            return _dataCenterMap = dataCenterMap;
        }

        private async Task<QosResult> GetSortedRegionLatencies(int timeoutMs,
            Dictionary<string, string> dataCenterMap, int pingsPerRegion, int degreeOfParallelism)
        {
            RegionPinger[] regionPingers = new RegionPinger[dataCenterMap.Count];

            int index = 0;
            foreach (KeyValuePair<string, string> datacenter in dataCenterMap)
            {
                regionPingers[index] = new RegionPinger(datacenter.Value, datacenter.Key, timeoutMs, NumTimeoutsForError, pingsPerRegion);
                index++;
            }

            // initialRegionIndexes are the index of the first region that a ping worker will use. Distribute the
            // indexes such that they are as far apart as possible to reduce the chance of sending all the pings
            // to the same region at the same time

            // Example, if there are 6 regions and 3 pings per region, we will start pinging at regions 0, 2, and 4
            // as shown in the table below

            //        Region 0    Region 1    Region 2    Region 3    Region 4    Region 5
            // Ping 1    x
            // Ping 2                           x
            // Ping 3                                                    x
            //
            ConcurrentBag<int> initialRegionIndexes = new ConcurrentBag<int>(Enumerable.Range(0, pingsPerRegion)
                .Select(i => i * dataCenterMap.Count / pingsPerRegion));

            Task[] pingWorkers = Enumerable.Range(0, degreeOfParallelism).Select(
                i => PingWorker(regionPingers, initialRegionIndexes)).ToArray();

            await Task.WhenAll(pingWorkers);

            List<QosRegionResult> results = regionPingers.Select(x => x.GetResult()).ToList();
            results.Sort((x, y) => x.LatencyMs.CompareTo(y.LatencyMs));

            QosErrorCode resultCode = QosErrorCode.Success;
            string errorMessage = null;
            if (results.All(x => x.ErrorCode == (int)QosErrorCode.NoResult))
            {
                resultCode = QosErrorCode.NoResult;
                errorMessage = "No valid results from any QoS server";
            }

            return new QosResult()
            {
                ErrorCode = (int)resultCode,
                RegionResults = results,
                ErrorMessage = errorMessage
            };
        }

        private async Task PingWorker(RegionPinger[] regionPingers, IProducerConsumerCollection<int> initialRegionIndexes)
        {
            // For each initialRegionIndex, walk through all regions and do a ping starting at the index given and
            // wrapping around to 0 when reaching the final index
            while (initialRegionIndexes.TryTake(out int initialRegionIndex))
            {
                for (int i = 0; i < regionPingers.Length; i++)
                {
                    int index = (i + initialRegionIndex) % regionPingers.Length;
                    await regionPingers[index].PingAsync();
                }
            }
        }

        private async Task SendSuccessfulQosResultsToPlayFab(object resultState)
        {
            var result = (QosResult)resultState;
            var eventContents = new EventContents
            {
                Name = "qos_result",
                EventNamespace = "playfab.servers",
                Payload = QosResultPlayFabEvent.CreateFrom(result)
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
