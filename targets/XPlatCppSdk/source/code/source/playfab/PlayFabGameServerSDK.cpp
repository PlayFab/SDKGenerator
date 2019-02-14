// Copyright (C) Microsoft Corporation. All rights reserved.

#include <stdafx.h>

#include <playfab/PlayFabGameServerSDK.h>
#include <playfab/PlayFabGameServerInternal.h>
#include <playfab/PlayFabPluginManager.h>

namespace PlayFab
{
    namespace GSDK
    {
        std::unique_ptr<PlayFabGameServerInternal> PlayFabGameServerInternal::m_instance = nullptr;
        std::mutex PlayFabGameServerInternal::m_gsdkInitMutex;
        volatile long long PlayFabGameServerInternal::m_exitStatus = 0;
        std::mutex PlayFabGameServerInternal::m_logLock;
        std::ofstream PlayFabGameServerInternal::m_logFile;
        bool PlayFabGameServerInternal::m_debug = false;
        std::unique_ptr<GameServerConfiguration> PlayFabGameServerInternal::testConfiguration = nullptr;

        PlayFabGameServerInternal::PlayFabGameServerInternal() : m_transitionToActiveEvent(), m_signalHeartbeatEvent(), m_initialPlayers()
        {
            // Need to setup the config first, as that tells us where to log
            GameServerConfiguration* config = nullptr;

            // Creating the smart ptr outside the if/else so the object is still alive when we access it below
            std::unique_ptr<GameServerConfiguration> configSmrtPtr = nullptr;

            // If they specified a particular config, use that, otherwise create our default
            if (testConfiguration != nullptr)
            {
                // Using .get() instead of std::move so that the object doesn't get destroyed after this constructor
                config = testConfiguration.get();
            }
            else
            {
                std::string file_name = PlayFabGameServerUtils::getEnvironmentVariable("GSDK_CONFIG_FILE");
                std::ifstream is(file_name, std::ifstream::in);

                if (is.fail())
                {
                    throw GSDKInitializationException("Could not read configuration file: " + file_name);
                }
                else
                {
                    configSmrtPtr = std::make_unique<JsonFileConfiguration>(file_name);
                }
                config = configSmrtPtr.get();
            }

            std::unordered_map<std::string, std::string> gameCerts = config->getGameCertificates();
            for (auto it = gameCerts.begin(); it != gameCerts.end(); ++it)
            {
                m_configSettings[it->first] = it->second;
            }

            std::unordered_map<std::string, std::string> metadata = config->getBuildMetadata();
            for (auto it = metadata.begin(); it != metadata.end(); ++it)
            {
                m_configSettings[it->first] = it->second;
            }

            std::unordered_map<std::string, std::string> ports = config->getGamePorts();
            for (auto it = ports.begin(); it != ports.end(); ++it)
            {
                m_configSettings[it->first] = it->second;
            }

            m_configSettings[PlayFabGameServerSDK::HEARTBEAT_ENDPOINT_KEY] = config->getHeartbeatEndpoint();
            m_configSettings[PlayFabGameServerSDK::SERVER_ID_KEY] = config->getServerId();
            m_configSettings[PlayFabGameServerSDK::LOG_FOLDER_KEY] = config->getLogFolder();
            m_configSettings[PlayFabGameServerSDK::SHARED_CONTENT_FOLDER_KEY] = config->getSharedContentFolder();
            m_configSettings[PlayFabGameServerSDK::CERTIFICATE_FOLDER_KEY] = config->getCertificateFolder();
            m_configSettings[PlayFabGameServerSDK::TITLE_ID_KEY] = config->getTitleId();
            m_configSettings[PlayFabGameServerSDK::BUILD_ID_KEY] = config->getBuildId();
            m_configSettings[PlayFabGameServerSDK::REGION_KEY] = config->getRegion();

            if (m_configSettings[PlayFabGameServerSDK::HEARTBEAT_ENDPOINT_KEY].empty() || m_configSettings[PlayFabGameServerSDK::SERVER_ID_KEY].empty())
            {
                throw GSDKInitializationException("Heartbeat endpoint and Server id are required configuration values.");
            }

            // We don't want to write files in our UTs
            if (config->shouldLog())
            {
                startLog();
            }

            GSDKLogMethod method_logger(__func__);
            try
            {
                std::string gsmsBaseUrl = m_configSettings[PlayFabGameServerSDK::HEARTBEAT_ENDPOINT_KEY];
                std::string instanceId = m_configSettings[PlayFabGameServerSDK::SERVER_ID_KEY];

                PlayFabGameServerSDK::logMessage("VM Agent Endpoint: " + gsmsBaseUrl);
                PlayFabGameServerSDK::logMessage("Instance Id: " + instanceId);

                m_heartbeatUrl.reserve(1024);
                m_heartbeatUrl += "http://";
                m_heartbeatUrl += gsmsBaseUrl;
                m_heartbeatUrl += "/v1/sessionHosts/";
                m_heartbeatUrl += instanceId;
                m_heartbeatUrl += "/heartbeats";

                m_cachedScheduledMaintenance = {};

                m_transitionToActiveEvent.Reset();
                m_signalHeartbeatEvent.Reset();

                // we might not want to heartbeat in our UTs
                m_keepHeartbeatRunning = config->shouldHeartbeat();
                m_heartbeatThread = std::thread(&PlayFabGameServerInternal::heartbeatThreadFunc, this);
            }
            catch (const std::exception &ex)
            {
                PlayFabGameServerSDK::logMessage(ex.what());
                throw;
            }
        }

        PlayFabGameServerInternal::~PlayFabGameServerInternal()
        {
            m_keepHeartbeatRunning = false;
            m_heartbeatThread.join();
        }

        void PlayFabGameServerInternal::startLog()
        {
            if (m_logFile.is_open())
            {
                return;
            }
            std::string logFile = "GSDK_output_" + std::to_string((unsigned long long)time(nullptr)) + ".txt";
            std::string logFolder = m_configSettings[PlayFabGameServerSDK::LOG_FOLDER_KEY];
            if (!logFolder.empty() && !PlayFabGameServerUtils::createDirectoryIfNotExists(logFolder)) // If we couldn't successfully create the path, just use the current directory
            {
                logFolder = "";
            }

            std::string logPath = logFolder + logFile;
            m_logFile.open(logPath.c_str(), std::ofstream::out);
        }

        void PlayFabGameServerInternal::heartbeatThreadFunc()
        {
            while (m_keepHeartbeatRunning)
            {
                if (m_signalHeartbeatEvent.Wait(1000))
                {
                    if (m_debug) PlayFabGameServerSDK::logMessage("State transition signaled an early heartbeat.");
                    m_signalHeartbeatEvent.Reset(); // We've handled this signal, so reset the event
                }

                if (m_keepHeartbeatRunning)
                {
                    sendHeartbeat();
                }
            }
        }

        void PlayFabGameServerInternal::sendHeartbeat()
        {
            std::string request = encodeHeartbeatRequest();
            IPlayFabHttpPlugin& http = *PlayFabPluginManager::GetPlugin<IPlayFabHttpPlugin>(PlayFabPluginContract::PlayFab_Transport);
            http.SimplePostCall(m_heartbeatUrl, request, OnHeartbeatResult, OnHeartbeatError);
        }

        void PlayFabGameServerInternal::OnHeartbeatResult(int httpCode, std::string response)
        {
            std::lock_guard<std::mutex> lock(get().m_receivedDataMutex);

            if (httpCode >= 300)
            {
                PlayFabGameServerSDK::logMessage("Received non-success code from Agent.  Status Code: " + std::to_string(httpCode) + " Response Body: " + response);
                return;
            }

            get().decodeHeartbeatResponse(response);
        }

        void PlayFabGameServerInternal::OnHeartbeatError(std::string error)
        {
            PlayFabGameServerSDK::logMessage("Received error during heartbeat: " + error);
        }

        std::string PlayFabGameServerInternal::encodeHeartbeatRequest()
        {
            Json::Value jsonHeartbeatRequest;

            jsonHeartbeatRequest["CurrentGameState"] = GameStateNames[static_cast<int>(m_heartbeatRequest.m_currentGameState)];

            auto temp = m_healthCallback;
            if (temp != nullptr)
            {
                m_heartbeatRequest.m_isGameHealthy = temp();
            }
            jsonHeartbeatRequest["CurrentGameHealth"] = m_heartbeatRequest.m_isGameHealthy ? "Healthy" : "Unhealthy";

            Json::Value jsonConnectedPlayerInfo;
            for (GameServerConnectedPlayer connectedPlayer : m_heartbeatRequest.m_connectedPlayers)
            {
                Json::Value playerInfo;
                playerInfo["PlayerId"] = connectedPlayer.m_playerId;
                jsonConnectedPlayerInfo.append(playerInfo);
            }
            jsonHeartbeatRequest["CurrentPlayers"] = jsonConnectedPlayerInfo;

            return jsonHeartbeatRequest.toStyledString();
        }

        std::tm PlayFabGameServerInternal::parseDate(const std::string &dateStr) // note: this code only supports ISO 8601 UTC date-times in the format yyyy-mm-ddThh:mm:ssZ
        {
            std::tm ret = {};
            bool failed;

            try
            {
                std::istringstream iss(dateStr);
                iss >> std::get_time(&ret, "%Y-%m-%dT%T");
                failed = iss.fail();
            }
            catch (...)
            {
                failed = true;
            }

            if (failed)
            {
                ret = {};
                ret.tm_year = 100;
            }

            return ret;
        }

        void PlayFabGameServerInternal::setState(GameState state)
        {
            std::lock_guard<std::mutex> lock(m_stateMutex);

            if (m_heartbeatRequest.m_currentGameState != state)
            {
                m_heartbeatRequest.m_currentGameState = state;
                m_signalHeartbeatEvent.Signal();
            }
        }

        void PlayFabGameServerInternal::setConnectedPlayers(const std::vector<GameServerConnectedPlayer> &currentConnectedPlayers)
        {
            std::lock_guard<std::mutex> lock(m_playersMutex);
            m_heartbeatRequest.m_connectedPlayers = currentConnectedPlayers;
        }

        void PlayFabGameServerInternal::runShutdownCallback()
        {
            std::function<void()> temp = get().m_shutdownCallback;
            if (temp != nullptr)
            {
                temp();
            }
            get().m_keepHeartbeatRunning = false;
        }

        void PlayFabGameServerInternal::decodeHeartbeatResponse(const std::string &responseJson)
        {
            Json::CharReaderBuilder jsonReaderFactory;
            std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
            Json::Value heartbeatResponse;
            JSONCPP_STRING jsonParseErrors;
            bool parsedSuccessfully = jsonReader->parse(responseJson.c_str(), responseJson.c_str() + responseJson.length(), &heartbeatResponse, &jsonParseErrors);

            if (parsedSuccessfully)
            {
                if (heartbeatResponse.isMember("sessionConfig"))
                {
                    Json::Value sessionConfig = heartbeatResponse["sessionConfig"];
                    for (Json::ValueIterator i = sessionConfig.begin(); i != sessionConfig.end(); ++i)
                    {
                        if ((*i).isString())
                        {
                            m_configSettings[i.key().asCString()] = (*i).asCString();
                        }
                    }

                    if (sessionConfig.isMember("initialPlayers"))
                    {
                        Json::Value players = sessionConfig["initialPlayers"];
                        for (Json::ArrayIndex i = 0; i < players.size(); ++i)
                        {
                            m_initialPlayers.push_back(players[i].asCString());
                        }
                    }

                }

                if (heartbeatResponse.isMember("nextScheduledMaintenanceUtc"))
                {
                    tm nextMaintenance = parseDate(heartbeatResponse["nextScheduledMaintenanceUtc"].asCString());
                    time_t nextMaintenanceTime = PlayFabGameServerUtils::tm2timet_utc(&nextMaintenance);
                    time_t cachedMaintenanceTime = PlayFabGameServerUtils::tm2timet_utc(&m_cachedScheduledMaintenance);
                    double diff = difftime(nextMaintenanceTime, cachedMaintenanceTime);
                    auto temp = m_maintenanceCallback;

                    // If the cached time converted to -1, it means we haven't cached anything yet
                    if (temp != nullptr && (static_cast<int>(diff) != 0 || cachedMaintenanceTime == -1))
                    {
                        temp(nextMaintenance);
                        m_cachedScheduledMaintenance = nextMaintenance; // cache it so we only notify once
                    }
                }

                if (heartbeatResponse.isMember("operation"))
                {
                    try
                    {
                        if (m_debug) {
                            PlayFabGameServerSDK::logMessage("Heartbeat request: { state = " + std::string(GameStateNames[static_cast<int>(m_heartbeatRequest.m_currentGameState)]) + "}"
                                + " response: { operation = " + heartbeatResponse["operation"].asString() + "}");
                        }

                        Operation nextOperation = OperationMap.at(heartbeatResponse["operation"].asCString());

                        switch (nextOperation)
                        {
                        case Operation::Continue:
                            // No action required
                            break;
                        case Operation::Active:
                            if (m_heartbeatRequest.m_currentGameState != GameState::Active)
                            {
                                setState(GameState::Active);
                                m_transitionToActiveEvent.Signal();
                            }
                            break;
                        case Operation::Terminate:
                            if (m_heartbeatRequest.m_currentGameState != GameState::Terminating)
                            {
                                setState(GameState::Terminating);
                                m_transitionToActiveEvent.Signal();
                                m_shutdownThread = std::async(std::launch::async, &runShutdownCallback);
                            }
                            break;
                        default:
                            PlayFabGameServerSDK::logMessage("Unhandled operation received: " + std::string(OperationNames[static_cast<int>(nextOperation)]));
                        }
                    }
                    catch (std::out_of_range&)
                    {
                        PlayFabGameServerSDK::logMessage("Unknown operation received: " + heartbeatResponse["operation"].asString());
                    }
                }
            }
        }

        PlayFabGameServerInternal &PlayFabGameServerInternal::get()
        {
            std::unique_lock<std::mutex> lock(m_gsdkInitMutex);

            if (!m_instance)
            {
                m_instance = std::make_unique<PlayFabGameServerInternal>();
            }
            return *m_instance;
        }

        void PlayFabGameServerSDK::start(bool debugLogs)
        {
            PlayFabGameServerInternal::m_debug = debugLogs;
            PlayFabGameServerInternal::get();
        }

        bool PlayFabGameServerSDK::readyForPlayers()
        {
            if (PlayFabGameServerInternal::get().m_heartbeatRequest.m_currentGameState != GameState::Active)
            {
                PlayFabGameServerInternal::get().setState(GameState::StandingBy);
                PlayFabGameServerInternal::get().m_transitionToActiveEvent.Wait();
            }

            return PlayFabGameServerInternal::get().m_heartbeatRequest.m_currentGameState == GameState::Active;
        }

        const std::unordered_map<std::string, std::string> & PlayFabGameServerSDK::getConfigSettings()
        {
            return PlayFabGameServerInternal::get().m_configSettings;
        }

        void PlayFabGameServerSDK::updateConnectedPlayers(const std::vector<GameServerConnectedPlayer> &currentlyConnectedPlayers)
        {
            PlayFabGameServerInternal::get().setConnectedPlayers(currentlyConnectedPlayers);
        }

        void PlayFabGameServerSDK::registerShutdownCallback(std::function< void() > callback)
        {
            PlayFabGameServerInternal::get().m_shutdownCallback = callback;
        }

        void PlayFabGameServerSDK::registerHealthCallback(std::function< bool() > callback)
        {
            PlayFabGameServerInternal::get().m_healthCallback = callback;
        }

        void PlayFabGameServerSDK::registerMaintenanceCallback(std::function< void(const tm &) > callback)
        {
            PlayFabGameServerInternal::get().m_maintenanceCallback = callback;
        }

        unsigned int PlayFabGameServerSDK::logMessage(const std::string &message)
        {
            std::unique_lock<std::mutex> lock(PlayFabGameServerInternal::m_logLock);
            PlayFabGameServerInternal::m_logFile << message.c_str() << std::endl;
            PlayFabGameServerInternal::m_logFile.flush();
            return 0;
        }

        const std::string &PlayFabGameServerSDK::getLogsDirectory()
        {
            // Declare as static so that it doesn't live on the stack (since we're returning a reference)
            static const std::string empty = "";

            const std::unordered_map<std::string, std::string> &config = PlayFabGameServerSDK::getConfigSettings();
            auto it = config.find(PlayFabGameServerSDK::LOG_FOLDER_KEY);

            if (it == config.end())
            {
                return empty;
            }
            else
            {
                return it->second;
            }
        }

        const std::string &PlayFabGameServerSDK::getSharedContentDirectory()
        {
            // Declare as static so that it doesn't live on the stack (since we're returning a reference)
            static const std::string empty = "";

            const std::unordered_map<std::string, std::string> &config = PlayFabGameServerSDK::getConfigSettings();
            auto it = config.find(PlayFabGameServerSDK::SHARED_CONTENT_FOLDER_KEY);

            if (it == config.end())
            {
                return empty;
            }
            else
            {
                return it->second;
            }
        }

        const std::vector<std::string> & PlayFabGameServerSDK::getInitialPlayers()
        {
            return PlayFabGameServerInternal::get().m_initialPlayers;
        }
    }
}