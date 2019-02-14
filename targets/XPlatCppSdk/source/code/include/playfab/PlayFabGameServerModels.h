// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <string>
#include <exception>
#include <vector>
#include <map>
#include <unordered_map>

namespace PlayFab
{
    namespace GSDK
    {
        class GameServerConnectedPlayer
        {
        public:
            std::string m_playerId;

            GameServerConnectedPlayer(std::string playerId)
            {
                m_playerId = playerId;
            }
        };

        class GSDKInitializationException : public std::runtime_error
        {
            using std::runtime_error::runtime_error;
        };

        class GameServerConfiguration
        {
        public:
            virtual const std::string &getHeartbeatEndpoint() = 0;
            virtual const std::string &getServerId() = 0;
            virtual const std::string &getLogFolder() = 0;
            virtual const std::string &getCertificateFolder() = 0;

            /// <summary>A folder shared by all the game servers within a VM (to cache user generated content and other data).</summary>
            virtual const std::string &getSharedContentFolder() = 0;

            virtual const std::unordered_map<std::string, std::string> &getGameCertificates() = 0;
            virtual const std::string &getTitleId() = 0;
            virtual const std::string &getBuildId() = 0;
            virtual const std::string &getRegion() = 0;
            virtual const std::unordered_map<std::string, std::string> &getBuildMetadata() = 0;
            virtual const std::unordered_map<std::string, std::string> &getGamePorts() = 0;
            virtual bool shouldLog() = 0;
            virtual bool shouldHeartbeat() = 0;

        protected:
            static constexpr const char* HEARTBEAT_ENDPOINT_ENV_VAR = "HEARTBEAT_ENDPOINT";
            static constexpr const char* SERVER_ID_ENV_VAR = "SESSION_HOST_ID";
            static constexpr const char* LOG_FOLDER_ENV_VAR = "GSDK_LOG_FOLDER";
            static constexpr const char* TITLE_ID_ENV_VAR = "PF_TITLE_ID";
            static constexpr const char* BUILD_ID_ENV_VAR = "PF_BUILD_ID";
            static constexpr const char* REGION_ENV_VAR = "PF_REGION";
            static constexpr const char* SHARED_CONTENT_FOLDER_ENV_VAR = "SHARED_CONTENT_FOLDER";
        };

#define MAKE_ENUM(VAR) VAR,
#define MAKE_STRINGS(VAR) #VAR,

#define GAME_STATES(DO) \
                DO( Invalid ) \
                DO( Initializing ) \
                DO( StandingBy ) \
                DO( Active ) \
                DO( Terminating ) \
                DO( Terminated ) \
                DO( Quarantined ) \

        enum class GameState
        {
            GAME_STATES(MAKE_ENUM)
        };

        const char* const GameStateNames[] =
        {
            GAME_STATES(MAKE_STRINGS)
        };

#define GAME_OPERATIONS(DO) \
                DO( Invalid ) \
                DO( Continue ) \
                DO( GetManifest ) \
                DO( Quarantine ) \
                DO( Active ) \
                DO( Terminate ) \
                DO( Operation_Count ) \

        enum class Operation
        {
            GAME_OPERATIONS(MAKE_ENUM)
        };

        const char* const OperationNames[] =
        {
            GAME_OPERATIONS(MAKE_STRINGS)
        };


        class SessionConfig
        {
        public:
            std::string m_sessionId;
            std::string m_sessionCookie;

            std::map<std::string, std::string> toMap()
            {
                std::map<std::string, std::string> ret;
                ret["sessionId"] = m_sessionId;
                ret["sessionCookie"] = m_sessionCookie;
                return ret;
            }
        };


        class SessionHostHeartbeatInfo
        {
        public:
            std::string currentGameState; // The current game state. For example - StandingBy, Active, etc.
            int currentGameHealth; // The last queried game host health status
            std::vector<GameServerConnectedPlayer> currentPlayers; // Keeps track of the current list of connected players
            int nextHeartbeatIntervalMs; // The number of milliseconds to wait before sending the next heartbeat.

            Operation operation; //The next operation the VM Agent wants us to take
            SessionConfig sessionConfig; // The configuration sent down to the game host from Control Plane
            time_t nextScheduledMaintenanceUtc; // The next scheduled maintenance time from Azure, in UTC
        };


        struct HeartbeatRequest
        {
            HeartbeatRequest()
            {
                m_currentGameState = GameState::Initializing;
                m_isGameHealthy = true;
            }

            volatile GameState m_currentGameState;
            bool m_isGameHealthy;
            std::vector<GameServerConnectedPlayer> m_connectedPlayers;
        };


        struct HeartbeatResponse
        {
            HeartbeatResponse()
            {
                m_errorValue = 0;
                m_nextScheduledMaintenanceUtc = 0; // set to POSIX start time
            }

            std::string m_operation;
            unsigned int m_nextHeartbeatMilliseconds;
            unsigned short m_statusCode;
            int m_errorValue;
            std::string m_errorMessage;
            std::string m_serverState;
            time_t m_nextScheduledMaintenanceUtc;
        };

        class JsonFileConfiguration : public GameServerConfiguration
        {
        public:
            JsonFileConfiguration(const std::string &file_name);

            const std::string &getTitleId();
            const std::string &getBuildId();
            const std::string &getRegion();
            const std::string &getHeartbeatEndpoint();
            const std::string &getServerId();
            const std::string &getLogFolder();
            const std::string &getCertificateFolder();
            const std::string &getSharedContentFolder();
            const std::unordered_map<std::string, std::string> &getGameCertificates();
            const std::unordered_map<std::string, std::string> &getBuildMetadata();
            const std::unordered_map<std::string, std::string> &getGamePorts();

            bool shouldLog();
            bool shouldHeartbeat();

        private:
            std::string m_titleId;
            std::string m_buildId;
            std::string m_region;
            std::string m_heartbeatEndpoint;
            std::string m_serverId;
            std::string m_logFolder;
            std::string m_certFolder;
            std::string m_sharedContentFolder;
            std::unordered_map<std::string, std::string> m_gameCerts;
            std::unordered_map<std::string, std::string> m_metadata;
            std::unordered_map<std::string, std::string> m_ports;
        };
    }
}