////////////////////////////////////////////////
// Copyright (C) Microsoft. All rights reserved.
////////////////////////////////////////////////

// GSDK Only has the following supported frameworks for now
#if NETSTANDARD2_0 || NETCOREAPP2_1
using System;
using System.Collections.Generic;
using System.IO;
using PlayFab.Json;

namespace PlayFab.GSDK
{
    public class GameServerConnectedPlayer
    {
        public string PlayerId { get; set; }

        public GameServerConnectedPlayer(string playerid)
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

    public class GameServerConfiguration
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

        // These two fields will be non-null only after allocation
        public string SessionId { get; set; }
        public string SessionCookie { get; set; }

        internal virtual bool ShouldLog() { return true; }

        protected const string TITLE_ID_ENV_VAR = "PF_TITLE_ID";
        protected const string BUILD_ID_ENV_VAR = "PF_BUILD_ID";
        protected const string REGION_ENV_VAR = "PF_REGION";

        public GameServerConfiguration()
        {
            GameCertificates = new Dictionary<string, string>();
            BuildMetadata = new Dictionary<string, string>();
            GamePorts = new Dictionary<string, string>();

            // These are always set as environment variables
            TitleId = Environment.GetEnvironmentVariable(TITLE_ID_ENV_VAR);
            BuildId = Environment.GetEnvironmentVariable(BUILD_ID_ENV_VAR);
            Region = Environment.GetEnvironmentVariable(REGION_ENV_VAR);
        }

        public GameServerConfiguration(GameServerConfiguration other)
        {
            HeartbeatEndpoint = other.HeartbeatEndpoint;
            ServerId = other.ServerId;
            LogFolder = other.LogFolder;
            CertificateFolder = other.CertificateFolder;
            SharedContentFolder = other.SharedContentFolder;
            GameCertificates = new Dictionary<string, string>(other.GameCertificates);
            TitleId = other.TitleId;
            BuildId = other.BuildId;
            Region = other.Region;
            BuildMetadata = new Dictionary<string, string>(other.BuildMetadata);
            GamePorts = new Dictionary<string, string>(other.GamePorts);
            SessionId = other.SessionId;
            SessionCookie = other.SessionCookie;
        }
    }

    internal class JsonFileConfiguration : GameServerConfiguration
    {
        private bool _shouldLog;

        internal override bool ShouldLog()
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
            
            if (string.IsNullOrWhiteSpace(HeartbeatEndpoint) || string.IsNullOrWhiteSpace(ServerId))
            {
                throw new GSDKInitializationException($"Heartbeat endpoint and Server id are required configuration values. Please double check configuration file at: {fileName}");
            }
        }
    }

    internal class JsonGsdkSchema
    {
        [JsonProperty(PropertyName = "heartbeatEndpoint")]
        public string HeartbeatEndpoint;

        [JsonProperty(PropertyName = "sessionHostId")]
        public string SessionHostId;

        [JsonProperty(PropertyName = "logFolder")]
        public string LogFolder;

        [JsonProperty(PropertyName = "sharedContentFolder")]
        public string SharedContentFolder;

        [JsonProperty(PropertyName = "certificateFolder")]
        public string CertificateFolder;

        [JsonProperty(PropertyName = "gameCertificates")]
        public IDictionary<string, string> GameCertificates;

        [JsonProperty(PropertyName = "buildMetadata")]
        public IDictionary<string, string> BuildMetadata;

        [JsonProperty(PropertyName = "gamePorts")]
        public IDictionary<string, string> GamePorts;

        [JsonProperty(PropertyName = "shouldLog")]
        public bool? ShouldLog;
    }

    internal class HeartbeatRequest
    {
        public GameState CurrentGameState { get; set; }
        public string CurrentGameHealth { get; set; }
        public GameServerConnectedPlayer[] CurrentPlayers { get; set; }
    }

    internal class HeartbeatResponse
    {
        [JsonProperty(PropertyName = "sessionConfig")]
        public SessionConfig SessionConfig { get; set; }

        [JsonProperty(PropertyName = "nextScheduledMaintenanceUtc")]
        public string NextScheduledMaintenanceUtc { get; set; }

        [JsonProperty(PropertyName = "operation")]
        public GameOperation Operation { get; set; }
    }

    internal class SessionConfig
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