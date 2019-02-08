// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.IO;
using PlayFab.Json;

namespace PlayFab
{
    public class GameserverConnectedPlayer
    {
        public string PlayerId { get; set; }

        public GameserverConnectedPlayer(string playerid)
        {
            this.PlayerId = playerid;
        }
    }

    public class GSDKInitializationException : Exception
    {
        public GSDKInitializationException(string message)
            : base(message) { }

        public GSDKInitializationException(string message, Exception innerException)
            : base(message, innerException) { }
    }

    class GameserverConfiguration
    {
        public string HeartbeatEndpoint { get; protected set; }
        public string ServerId { get; protected set; }
        public string LogFolder { get; protected set; }
        public string CertificateFolder { get; set; }

        /// <summary>
        /// A folder shared by all the game servers within a VM (to cache user generated content and other data).
        /// </summary>
        public string SharedContentFolder { get; set; }

        public IDictionary<string, string> GameCertificates { get; set; }
        public string TitleId { get; set; }
        public string BuildId { get; set; }
        public string Region { get; set; }
        public IDictionary<string, string> BuildMetadata { get; set; }
        public IDictionary<string, string> GamePorts { get; set; }

        public virtual bool ShouldLog() { return true; }

        protected const string HEARTBEAT_ENDPOINT_ENV_VAR = "HEARTBEAT_ENDPOINT";
        protected const string SERVER_ID_ENV_VAR = "SESSION_HOST_ID";
        protected const string LOG_FOLDER_ENV_VAR = "GSDK_LOG_FOLDER";
        protected const string TITLE_ID_ENV_VAR = "PF_TITLE_ID";
        protected const string BUILD_ID_ENV_VAR = "PF_BUILD_ID";
        protected const string REGION_ENV_VAR = "PF_REGION";
        protected const string SHARED_CONTENT_FOLDER_ENV_VAR = "SHARED_CONTENT_FOLDER";

        public GameserverConfiguration()
        {
            GameCertificates = new Dictionary<string, string>();
            BuildMetadata = new Dictionary<string, string>();
            GamePorts = new Dictionary<string, string>();
        }
    }

    class EnvironmentVariableConfiguration : GameserverConfiguration
    {
        public EnvironmentVariableConfiguration() : base()
        {
            HeartbeatEndpoint = Environment.GetEnvironmentVariable(HEARTBEAT_ENDPOINT_ENV_VAR);
            ServerId = Environment.GetEnvironmentVariable(SERVER_ID_ENV_VAR);
            LogFolder = Environment.GetEnvironmentVariable(LOG_FOLDER_ENV_VAR);
            SharedContentFolder = Environment.GetEnvironmentVariable(SHARED_CONTENT_FOLDER_ENV_VAR);
            if (string.IsNullOrWhiteSpace(HeartbeatEndpoint) || string.IsNullOrWhiteSpace(ServerId))
            {
                throw new GSDKInitializationException("Heartbeat endpoint and Server id are required configuration values.");
            }
        }
    }

    class JsonFileConfiguration : GameserverConfiguration
    {
        private bool _shouldLog;

        public override bool ShouldLog()
        {
            return _shouldLog;
        }

        public JsonFileConfiguration(ISerializerPlugin jsonSerializer, string fileName) : base()
        {
            try
            {
                using (StreamReader reader = File.OpenText(fileName))
                {
                    JsonGsdkSchema config = jsonSerializer.DeserializeObject<JsonGsdkSchema>(reader.ReadToEnd());

                    HeartbeatEndpoint = config.HeartbeatEndpoint;
                    ServerId = config.SessionHostId;
                    LogFolder = config.LogFolder;
                    SharedContentFolder = config.SharedContentFolder;
                    CertificateFolder = config.CertificateFolder;
                    GameCertificates = config.GameCertificates ?? new Dictionary<string, string>();
                    GamePorts = config.GamePorts ?? new Dictionary<string, string>();
                    BuildMetadata = config.BuildMetadata ?? new Dictionary<string, string>();
                    _shouldLog = config.ShouldLog.HasValue && config.ShouldLog.Value;
                }
            }
            catch (Exception ex)
            {
                throw new GSDKInitializationException($"Cannot read configuration file {fileName}", ex);
            }
        }
    }

    class JsonGsdkSchema
    {
        [JsonProperty(PropertyName = "heartbeatEndpoint")]
        public string HeartbeatEndpoint { get; set; }

        [JsonProperty(PropertyName = "sessionHostId")]
        public string SessionHostId { get; set; }

        [JsonProperty(PropertyName = "logFolder")]
        public string LogFolder { get; set; }

        [JsonProperty(PropertyName = "sharedContentFolder")]
        public string SharedContentFolder { get; set; }

        [JsonProperty(PropertyName = "certificateFolder")]
        public string CertificateFolder { get; set; }

        [JsonProperty(PropertyName = "gameCertificates")]
        public IDictionary<string, string> GameCertificates { get; set; }

        [JsonProperty(PropertyName = "buildMetadata")]
        public IDictionary<string, string> BuildMetadata { get; set; }

        [JsonProperty(PropertyName = "gamePorts")]
        public IDictionary<string, string> GamePorts { get; set; }

        [JsonProperty(PropertyName = "shouldLog")]
        public bool? ShouldLog { get; set; }
    }

    class HeartbeatRequest
    {
        public GameState CurrentGameState { get; set; }
        public string CurrentGameHealth { get; set; }
        public GameserverConnectedPlayer[] CurrentPlayers { get; set; }
    }

    class HeartbeatResponse
    {
        [JsonProperty(PropertyName = "sessionConfig")]
        public SessionConfig SessionConfig { get; set; }

        [JsonProperty(PropertyName = "nextScheduledMaintenanceUtc")]
        public string NextScheduledMaintenanceUtc { get; set; }

        [JsonProperty(PropertyName = "operation")]
        public GameOperation Operation { get; set; }
    }

    class SessionConfig
    {
        [JsonProperty(PropertyName = "sessionId")]
        public Guid SessionId { get; set; }

        [JsonProperty(PropertyName = "sessionCookie")]
        public string SessionCookie { get; set; }

        [JsonProperty(PropertyName = "initialPlayers")]
        public List<string> InitialPlayers { get; set; }
    }
}
#endif