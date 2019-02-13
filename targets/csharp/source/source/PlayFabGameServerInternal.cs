////////////////////////////////////////////////
// Copyright (C) Microsoft. All rights reserved.
////////////////////////////////////////////////

// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace PlayFab.GSDK
{
    internal class GameServerInternalSdk : IDisposable
    {
        private string _overrideConfigFileName;
        private GameState _state;

        private Task _heartbeatTask;
        private IGameServerHttpClient _webClient;
        private bool _heartbeatRunning;
        private DateTime _cachedScheduleMaintDate;
        private ManualResetEvent _heartbeatDoneEvent = new ManualResetEvent(false);
        private ManualResetEvent _signalHeartbeatEvent = new ManualResetEvent(false);
        private bool _shouldWriteDebugLogs;

        internal GameServerConfiguration Configuration { get; private set; }

        public ManualResetEvent TransitionToActiveEvent { get; set; }
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

            Configuration = Configuration ?? GetConfiguration();
            Logger = LoggerFactory.CreateInstance(Configuration.LogFolder);
            
            if (Configuration.ShouldLog())
            {
                Logger.Start();
            }

            string heartbeatEndpoint = Configuration.HeartbeatEndpoint;
            string serverId = Configuration.ServerId;

            Logger.Log($"VM Agent Endpoint: {heartbeatEndpoint}");
            Logger.Log($"Server Id: {serverId}");

            _webClient = GameServerHttpClientFactory.CreateInstance($"http://{heartbeatEndpoint}/v1/sessionHosts/{serverId}");

            _heartbeatRunning = true;
            _signalHeartbeatEvent.Reset();
            TransitionToActiveEvent.Reset();

            _heartbeatTask = Task.Run(HeartbeatAsync);
            return Task.CompletedTask;
        }

        private GameServerConfiguration GetConfiguration()
        {
            string fileName;
            if (!string.IsNullOrWhiteSpace(_overrideConfigFileName))
            {
                fileName = _overrideConfigFileName;
            }
            else
            {
                fileName = Environment.GetEnvironmentVariable(PlayFabGameServerSDK.GsdkConfigFileEnvVarKey);
            }

            var jsonWrapper = PlayFab.PluginManager.GetPlugin<ISerializerPlugin>(PluginContract.PlayFab_Serializer);
            return new JsonFileConfiguration(jsonWrapper, fileName); ;
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
            // Only setting these values if something was sent from the Agent, this will prevent us from
            // deleting our session config if the next heartbeat comes back empty.
            if (response.SessionConfig != null)
            {
                if (!string.IsNullOrEmpty(response.SessionConfig.SessionCookie))
                {
                    Configuration.SessionCookie = response.SessionConfig.SessionCookie;
                }

                if (response.SessionConfig.SessionId != Guid.Empty)
                {
                    Configuration.SessionId = response.SessionConfig.SessionId.ToString();
                }

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
                    // No action required
                    break;
                case GameOperation.Active:
                    if (State != GameState.Active)
                    {
                        State = GameState.Active;
                    }

                    TransitionToActiveEvent.Set();

                    break;
                case GameOperation.Terminate:
                    if (State != GameState.Terminating)
                    {
                        State = GameState.Terminating;
                        ShutdownCallback?.Invoke();
                    }

                    TransitionToActiveEvent.Set();

                    break;
                default:
                    Logger.Log($"Unknown operation received: {Enum.GetName(typeof(GameOperation), response.Operation)}");
                    break;
            }

            return Task.CompletedTask;
        }

#region IDisposable Support
        private bool _disposedValue = false; // To detect redundant calls

        private void DisposeManagedResources(bool disposing)
        {
            if (!_disposedValue)
            {
                if (disposing)
                {
                    _heartbeatRunning = false;
                    _heartbeatDoneEvent.WaitOne();
                }

                _disposedValue = true;
            }
        }

        // This code added to correctly implement the disposable pattern.
        public void Dispose()
        {
            // Do not change this code. Put cleanup code in Dispose(bool disposing) above.
            DisposeManagedResources(true);
        }
#endregion
    }
}
#endif