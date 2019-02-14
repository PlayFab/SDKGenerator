#include <stdafx.h>
#include <TestGSDKConfig.h>

namespace PlayFab
{
    namespace GSDK {
        TestConfig::TestConfig(const std::string & heartbeatEndpoint,
            const std::string & serverId,
            const std::string & logFolder,
            const std::string & sharedContentFolder,
            const std::string & certFolder,
            const std::unordered_map<std::string, std::string> & gameCerts,
            const std::string & titleId,
            const std::string & buildId,
            const std::string & region,
            const std::unordered_map<std::string, std::string> & metadata,
            const std::unordered_map<std::string, std::string> & ports)
        {
            m_heartbeatEndpoint = heartbeatEndpoint;
            m_serverId = serverId;
            m_logFolder = logFolder;
            m_sharedContentFolder = sharedContentFolder;
            m_certFolder = certFolder;
            m_gameCerts = gameCerts;
            m_titleId = titleId;
            m_buildId = buildId;
            m_region = region;
            m_metadata = metadata;
            m_ports = ports;
        }

        const std::string &TestConfig::getHeartbeatEndpoint()
        {
            return m_heartbeatEndpoint;
        }

        const std::string &TestConfig::getServerId()
        {
            return m_serverId;
        }

        const std::string &TestConfig::getLogFolder()
        {
            return m_logFolder;
        }

        const std::string &TestConfig::getSharedContentFolder()
        {
            return m_sharedContentFolder;
        }

        const std::string &TestConfig::getCertificateFolder()
        {
            return m_certFolder;
        }

        const std::unordered_map<std::string, std::string> &TestConfig::getGameCertificates()
        {
            return m_gameCerts;
        }

        const std::string &TestConfig::getTitleId()
        {
            return m_titleId;
        }

        const std::string &TestConfig::getBuildId()
        {
            return m_buildId;
        }

        const std::string &TestConfig::getRegion()
        {
            return m_region;
        }

        bool TestConfig::shouldLog()
        {
            return false;
        }

        bool TestConfig::shouldHeartbeat()
        {
            return false;
        }

        const std::unordered_map<std::string, std::string> &TestConfig::getBuildMetadata()
        {
            return m_metadata;
        }

        const std::unordered_map<std::string, std::string> &TestConfig::getGamePorts()
        {
            return m_ports;
        }
    }
}