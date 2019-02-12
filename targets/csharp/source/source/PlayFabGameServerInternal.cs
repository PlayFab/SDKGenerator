// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PlayFab
{
    class GameServerInternalSdk : IDisposable
    {
        private string _overrideConfigFileName;
        private GameState _state;

        private Task _heartbeatTask;
        private GameServerConfiguration _configuration;
        private IGameServerHttpClient _webClient;
        private bool _heartbeatRunning;
        private DateTime _cachedScheduleMaintDate;
        private ManualResetEvent _heartbeatDoneEvent = new ManualResetEvent(false);
        private ManualResetEvent _signalHeartbeatEvent = new ManualResetEvent(false);
        private bool _shouldWriteDebugLogs;

        public ManualResetEvent TransitionToActiveEvent { get; set; }
        public IDictionary<string, string> ConfigMap { get; private set; }
        public ILogger Logger { get; private set; }
        public GameState State
        {
            get { return _state; }
            set
            {
                if (_state != value)
                {
                    _state = value;
                    _signalHeartbeatEvent.Set();
                }
            }
        }

        public IList<GameServerConnectedPlayer> ConnectedPlayers { get; set; }

        public IList<string> InitialPlayers { get; set; }

        // Keep an instance of the callbacks around so they don't get garbage collected
        public Action ShutdownCallback { get; set; }
        public Func<bool> HealthCallback { get; set; }
        public Action<DateTimeOffset> MaintenanceCallback { get; set; }


        public GameServerInternalSdk(string configFileName = null)
        {
            _overrideConfigFileName = configFileName;
            ConnectedPlayers = new List<GameServerConnectedPlayer>();
            InitialPlayers = new List<string>();
            TransitionToActiveEvent = new ManualResetEvent(false);
        }

        public Task StartAsync(bool shouldWriteDebugLogs = false)
        {
            // If we already initialized everything, no need to do it again
            if (_heartbeatTask != null)
            {
                return Task.CompletedTask;
            }

            _shouldWriteDebugLogs = shouldWriteDebugLogs;

            _configuration = _configuration ?? GetConfiguration();
            ConfigMap = ConfigMap ?? CreateConfigMap(_configuration);
            Logger = LoggerFactory.CreateInstance(ConfigMap[PlayFabGameServerSDK.LogFolderKey]);
            
            if (_configuration.ShouldLog())
            {
                Logger.Start();
            }

            string gsmsBaseUrl = ConfigMap[PlayFabGameServerSDK.HeartbeatEndpointKey];
            string instanceId = ConfigMap[PlayFabGameServerSDK.ServerIdKey];

            Logger.Log($"VM Agent Endpoint: {gsmsBaseUrl}");
            Logger.Log($"Instance Id: {instanceId}");

            _webClient = GameServerHttpClientFactory.CreateInstance($"http://{gsmsBaseUrl}/v1/sessionHosts/{instanceId}");

            _heartbeatRunning = true;
            _signalHeartbeatEvent.Reset();
            TransitionToActiveEvent.Reset();

            _heartbeatTask = Task.Run(HeartbeatAsync);
            return Task.CompletedTask;
        }

        private GameServerConfiguration GetConfiguration()
        {
            string fileName = !string.IsNullOrWhiteSpace(_overrideConfigFileName) ? _overrideConfigFileName
                                : Environment.GetEnvironmentVariable(PlayFabGameServerSDK.GsdkConfigFileEnvVarKey);

            GameServerConfiguration localConfig;

            if (!string.IsNullOrWhiteSpace(fileName) && File.Exists(fileName))
            {
                var jsonWrapper = PlayFab.PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);

                localConfig = new JsonFileConfiguration(jsonWrapper, fileName);
            }
            else
            {
                localConfig = new EnvironmentVariableConfiguration();
            }

            return localConfig;
        }

        private IDictionary<string, string> CreateConfigMap(GameServerConfiguration localConfig)
        {
            var finalConfig = new Dictionary<string, string>();

            foreach (KeyValuePair<string, string> certEntry in localConfig.GameCertificates)
            {
                finalConfig[certEntry.Key] = certEntry.Value;
            }

            foreach (KeyValuePair<string, string> metadata in localConfig.BuildMetadata)
            {
                finalConfig[metadata.Key] = metadata.Value;
            }

            foreach (KeyValuePair<string, string> port in localConfig.GamePorts)
            {
                finalConfig[port.Key] = port.Value;
            }

            finalConfig[PlayFabGameServerSDK.HeartbeatEndpointKey] = localConfig.HeartbeatEndpoint;
            finalConfig[PlayFabGameServerSDK.ServerIdKey] = localConfig.ServerId;
            finalConfig[PlayFabGameServerSDK.LogFolderKey] = localConfig.LogFolder;
            finalConfig[PlayFabGameServerSDK.SharedContentFolderKey] = localConfig.SharedContentFolder;
            finalConfig[PlayFabGameServerSDK.CertificateFolderKey] = localConfig.CertificateFolder;
            finalConfig[PlayFabGameServerSDK.TitleIdKey] = localConfig.TitleId;
            finalConfig[PlayFabGameServerSDK.BuildIdKey] = localConfig.BuildId;
            finalConfig[PlayFabGameServerSDK.RegionKey] = localConfig.Region;

            return finalConfig;
        }

        private async Task HeartbeatAsync()
        {
            while (_heartbeatRunning)
            {
                if (_signalHeartbeatEvent.WaitOne(1000))
                {
                    if (_shouldWriteDebugLogs)
                    {
                        Logger.Log($"Game state transition occurred, new game state is {this.State}. Sending heartbeat sooner than the configured 1 second interval.");
                    }

                    _signalHeartbeatEvent.Reset();
                }

                await SendHeartbeatAsync();
            }

            Logger.Log("Shutting down heartbeat thread");
            _heartbeatDoneEvent.Set();
        }

        internal async virtual Task SendHeartbeatAsync()
        {
            bool isGameHealthy = false;
            if (HealthCallback != null)
            {
                isGameHealthy = HealthCallback();
            }

            var payload = new HeartbeatRequest
            {
                CurrentGameState = this.State,
                CurrentGameHealth = isGameHealthy ? "Healthy" : "Unhealthy",
                CurrentPlayers = ConnectedPlayers.ToArray(),
            };

            try
            {
                HeartbeatResponse response = await _webClient.SendHeartbeatAsync(payload);
                await UpdateStateFromHeartbeatAsync(response);

                if (_shouldWriteDebugLogs)
                {
                    Logger.Log($"Heartbeat request: {{ state = {payload.CurrentGameState} }} response: {{ operation = {response.Operation} }}");
                }
            }
            catch (Exception ex)
            {
                Logger.Log($"Cannot send heartbeat: {ex.Message}\r\n\r\n{ex}");
                return;
            }
        }

        private Task UpdateStateFromHeartbeatAsync(HeartbeatResponse response)
        {
            if (response.SessionConfig != null)
            {
                ConfigMap.AddIfNotNullOrEmpty("sessionCookie", response.SessionConfig?.SessionCookie);
                ConfigMap.AddIfNotNullOrEmpty("sessionId", response.SessionConfig?.SessionId.ToString());

                // Only setting InitialPlayers if something was sent from the Agent, this will prevent us effectively
                // deleting our initial player list if the next heartbeat comes back empty.
                if (response.SessionConfig?.InitialPlayers?.Count > 0)
                {
                    InitialPlayers = response.SessionConfig.InitialPlayers;
                }
            }

            if (!string.IsNullOrWhiteSpace(response.NextScheduledMaintenanceUtc))
            {
                if (DateTime.TryParse(
                    response.NextScheduledMaintenanceUtc,
                    null,
                    DateTimeStyles.RoundtripKind,
                    out DateTime scheduledMaintDate))
                {
                    if (_cachedScheduleMaintDate == DateTime.MinValue || (scheduledMaintDate != _cachedScheduleMaintDate))
                    {
                        MaintenanceCallback?.Invoke(scheduledMaintDate);
                        _cachedScheduleMaintDate = scheduledMaintDate;
                    }
                }
            }

            switch (response.Operation)
            {
                case GameOperation.Continue:
                    {
                        // No action required
                        break;
                    }
                case GameOperation.Active:
                    {
                        if (State != GameState.Active)
                        {
                            State = GameState.Active;
                        }

                        TransitionToActiveEvent.Set();

                        break;
                    }
                case GameOperation.Terminate:
                    {
                        if (State != GameState.Terminating)
                        {
                            State = GameState.Terminating;
                            ShutdownCallback?.Invoke();
                        }

                        TransitionToActiveEvent.Set();

                        break;
                    }
                default:
                    {
                        Logger.Log($"Unknown operation received: {Enum.GetName(typeof(GameOperation), response.Operation)}");
                        break;
                    }

            }

            return Task.CompletedTask;
        }

#region IDisposable Support
        private bool disposedValue = false; // To detect redundant calls

        private void DisposeManagedResources(bool disposing)
        {
            if (!disposedValue)
            {
                if (disposing)
                {
                    _heartbeatRunning = false;
                    _heartbeatDoneEvent.WaitOne();
                }

                // TODO: free unmanaged resources (unmanaged objects) and override a finalizer below.
                // TODO: set large fields to null.

                disposedValue = true;
            }
        }

        // TODO: override a finalizer only if Dispose(bool disposing) above has code to free unmanaged resources.
        // ~InternalSdk() {
        //   // Do not change this code. Put cleanup code in Dispose(bool disposing) above.
        //   Dispose(false);
        // }

        // This code added to correctly implement the disposable pattern.
        public void Dispose()
        {
            // Do not change this code. Put cleanup code in Dispose(bool disposing) above.
            DisposeManagedResources(true);
            // TODO: uncomment the following line if the finalizer is overridden above.
            // GC.SuppressFinalize(this);
        }
#endregion
    }
}
#endif