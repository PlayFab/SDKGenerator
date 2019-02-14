// Copyright (C) Microsoft Corporation. All rights reserved.

#include <stdafx.h>

#include <playfab/PlayFabGameServerModels.h>
#include <playfab/PlayFabGameServerUtils.h>

namespace PlayFab
{
    namespace GSDK
    {
        JsonFileConfiguration::JsonFileConfiguration(const std::string &file_name)
        {
            // These are always set as environment variables, even with the new gsdk config json file
            m_titleId = PlayFabGameServerUtils::getEnvironmentVariable(GameServerConfiguration::TITLE_ID_ENV_VAR);
            m_buildId = PlayFabGameServerUtils::getEnvironmentVariable(GameServerConfiguration::BUILD_ID_ENV_VAR);
            m_region = PlayFabGameServerUtils::getEnvironmentVariable(GameServerConfiguration::REGION_ENV_VAR);

            std::ifstream is(file_name, std::ifstream::in);

            if (!is.fail())
            {
                Json::CharReaderBuilder jsonReaderFactory;
                Json::Value configFile;

                JSONCPP_STRING jsonParseErrors;
                bool parsedSuccessfully = Json::parseFromStream(jsonReaderFactory, is, &configFile, &jsonParseErrors);

                if (parsedSuccessfully)
                {
                    m_heartbeatEndpoint = configFile["heartbeatEndpoint"].asString();
                    m_serverId = configFile["sessionHostId"].asString();
                    m_logFolder = configFile["logFolder"].asString();
                    m_sharedContentFolder = configFile["sharedContentFolder"].asString();

                    if (configFile.isMember("certificateFolder"))
                    {
                        m_certFolder = configFile["certificateFolder"].asString();
                    }
                    else
                    {
                        m_certFolder = std::string();
                    }

                    if (configFile.isMember("gameCertificates"))
                    {
                        Json::Value gameCerts = configFile["gameCertificates"];
                        for (Json::ValueIterator i = gameCerts.begin(); i != gameCerts.end(); ++i)
                        {
                            m_gameCerts[i.key().asCString()] = (*i).asCString();
                        }
                    }

                    if (configFile.isMember("buildMetadata"))
                    {
                        Json::Value metadata = configFile["buildMetadata"];
                        for (Json::ValueIterator i = metadata.begin(); i != metadata.end(); ++i)
                        {
                            m_metadata[i.key().asCString()] = (*i).asCString();
                        }
                    }

                    if (configFile.isMember("gamePorts"))
                    {
                        Json::Value ports = configFile["gamePorts"];
                        for (Json::ValueIterator i = ports.begin(); i != ports.end(); ++i)
                        {
                            m_ports[i.key().asCString()] = (*i).asCString();
                        }
                    }
                }
                else
                {
                    // No logging setup at this point, so throw an exception
                    throw GSDKInitializationException("Failed to parse configuration: " + jsonParseErrors);
                }
            }
            else
            {
                throw GSDKInitializationException("Failed to open configuration file: " + file_name);
            }
        }

        const std::string &JsonFileConfiguration::getTitleId()
        {
            return m_titleId;
        }

        const std::string &JsonFileConfiguration::getBuildId()
        {
            return m_buildId;
        }

        const std::string &JsonFileConfiguration::getRegion()
        {
            return m_region;
        }

        const std::string &JsonFileConfiguration::getHeartbeatEndpoint()
        {
            return m_heartbeatEndpoint;
        }

        const std::string &JsonFileConfiguration::getServerId()
        {
            return m_serverId;
        }

        const std::string &JsonFileConfiguration::getLogFolder()
        {
            return m_logFolder;
        }

        const std::string &JsonFileConfiguration::getSharedContentFolder()
        {
            return m_sharedContentFolder;
        }

        const std::string &JsonFileConfiguration::getCertificateFolder()
        {
            return m_certFolder;
        }

        const std::unordered_map<std::string, std::string> &JsonFileConfiguration::getGameCertificates()
        {
            return m_gameCerts;
        }

        const std::unordered_map<std::string, std::string> &JsonFileConfiguration::getBuildMetadata()
        {
            return m_metadata;
        }

        const std::unordered_map<std::string, std::string> &JsonFileConfiguration::getGamePorts()
        {
            return m_ports;
        }

        bool JsonFileConfiguration::shouldLog()
        {
            return true;
        }

        bool JsonFileConfiguration::shouldHeartbeat()
        {
            return true;
        }
    }
}