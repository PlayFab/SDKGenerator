// Copyright (C) Microsoft Corporation. All rights reserved.

#include <stdafx.h>

#include <playfab/PlayFabGameServerUtils.h>

#ifdef PLAYFAB_PLATFORM_LINUX
#include "sys/stat.h"
#include "sys/types.h"
#include "unistd.h"
#else
#include "filesystem"
#include "process.h"
#endif

namespace PlayFab
{
    namespace GSDK
    {
        std::string PlayFabGameServerUtils::getEnvironmentVariable(const char *environmentVariableName)
        {
#ifdef PLAYFAB_PLATFORM_LINUX
            char* envVal = ::getenv(environmentVariableName);
            if (envVal != nullptr)
            {
                return envVal;
            }
            else
            {
                return "";
            }
#else
            size_t logFolderNameLength = 0;
            char logFolderBuffer[8192]; // significantly arbitrarily larger than any path we will ever create
            if (::getenv_s(&logFolderNameLength, logFolderBuffer, environmentVariableName) == 0)
            {
                return logFolderBuffer;
            }
            else
            {
                return "";
            }
#endif
        }

        std::wstring PlayFabGameServerUtils::getEnvironmentVariableW(const wchar_t *environmentVariableName)
        {
            return STR2WSTR(PlayFabGameServerUtils::getEnvironmentVariable(WCHAR2CHAR(environmentVariableName)));
        }

        bool PlayFabGameServerUtils::createDirectoryIfNotExists(std::string path)
        {
            try
            {
#ifdef PLAYFAB_PLATFORM_LINUX
                return mkdir(path.c_str(), S_IRWXU | S_IRWXG | S_IROTH | S_IWOTH | S_IXOTH);
#else
                std::experimental::filesystem::create_directories(std::experimental::filesystem::path(path));
                return true;
#endif
            }
            catch (...)
            {
                return false;
            }
        }

        time_t PlayFabGameServerUtils::tm2timet_utc(tm * tm)
        {
#ifdef PLAYFAB_PLATFORM_LINUX
            return timegm(tm);
#else
            return _mkgmtime(tm);
#endif
        }
    }
}