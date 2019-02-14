// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <playfab/PlayFabGameServerLog.h>
#include <playfab/PlayFabGameServerUtils.h>
#include <playfab/ManualResetEvent.h>
#include <playfab/PlayFabGameServerModels.h>

#include <playfab/PlayFabCallRequestContainer.h>

namespace PlayFab
{
    namespace GSDK
    {
        class PlayFabGameServerInternal
        {
            friend class PlayFabGameServerSDK;
            friend class GSDKTests;
        public:
            // These must be public for unique_ptr to work
            PlayFabGameServerInternal();
            ~PlayFabGameServerInternal();

        private:
            // NOTE: Making this map non-static, because otherwise the heartbeat thread
            // will throw an access violation exception when the game server main loop returns
            // (As C++ starts getting rid of all statics)
#define MAKE_OPERATION_MAP(VAR) {#VAR, Operation::VAR},
            const std::map<std::string, Operation> OperationMap =
            {
                GAME_OPERATIONS(MAKE_OPERATION_MAP)
            };

            std::string m_agentEntpoint;
            HeartbeatRequest m_heartbeatRequest;
            std::string m_sessionCookie;
            int m_heatbeatInterval;
            std::string m_heartbeatUrl;

            std::function<void()> m_shutdownCallback;
            std::function<bool()> m_healthCallback;
            std::function<void(const tm &)> m_maintenanceCallback;

            std::unordered_map<std::string, std::string> m_configSettings;
            tm m_cachedScheduledMaintenance;

            std::atomic<bool> m_keepHeartbeatRunning;

            // NOTE: DO NOT make this a std::future instead of a std::thread.
            // 
            // Something about how the CRT runtime cleans things up makes it so that
            // if this is a std::future (from a std::async), when we exit a game program
            // from c#, by the time it reaches the c++ gsdk destructor, the heartbeat thread
            // is gone, and calling wait on the std::future will hang forever. However, calling
            // join on the std::thread doesn't hang, it seems to understand the thread exited.
            std::thread m_heartbeatThread;

            std::future<void> m_shutdownThread;

            std::mutex m_receivedDataMutex;
            std::string m_receivedData;
            ManualResetEvent m_transitionToActiveEvent;
            ManualResetEvent m_signalHeartbeatEvent;
            std::mutex m_stateMutex;
            std::mutex m_playersMutex;

            std::vector<std::string> m_initialPlayers;

            static std::unique_ptr<PlayFabGameServerInternal> m_instance;
            static std::mutex m_gsdkInitMutex;

            static volatile long long m_exitStatus;
            static std::mutex m_logLock;
            static std::ofstream m_logFile;

            void heartbeatThreadFunc();
            static void runShutdownCallback();

            static bool m_debug;

            void startLog();
            void sendHeartbeat();
            static void OnHeartbeatResult(int httpCode, std::string response);
            static void OnHeartbeatError(std::string error);


            // These two methods are used for unit testing
            std::string encodeHeartbeatRequest();
            void decodeHeartbeatResponse(const std::string &responseJson);

            std::tm parseDate(const std::string &dateStr);
            void setState(GameState state);
            void setConnectedPlayers(const std::vector<GameServerConnectedPlayer> &currentConnectedPlayers);

            static PlayFabGameServerInternal &get();
            static std::unique_ptr<GameServerConfiguration> testConfiguration; // may be overriden by unit tests
        };
    }
}