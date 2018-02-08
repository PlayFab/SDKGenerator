#include "StdAfx.h"

// #THIRD_KIND_PLAYFAB_DATA_GATHERER: gwatson (2017/09/12) - Added PlayFab data gatherer to send system information events to PlayFab on login

#include "PlayFabDataGatherer.h"

#include <System.h>
#include <AzCore/std/string/conversions.h>
#include <AzCore/PlatformDef.h>
#include <sstream>
#include <AutoDetectSpec.h>
#include <CPUDetect.h>

#if !defined(AZ_MONOLITHIC_BUILD)
// The symbols for accessing the cpu information are not dll exported, however the functions are all static, so
// we include the cpp files directly here. Ugly, but its the only way to access these functions without modifying
// the engine.
#pragma warning(disable: 4005)
#include <AutoDetectSpec.cpp>
#include <CPUDetect.cpp>
#endif

namespace PlayFab
{
    uint ProcSpeedRead()
    {
        DWORD speed;
        DWORD dataSize = sizeof(speed);
        HKEY hKey;

        // Query the registry
        long error = RegOpenKeyEx(HKEY_LOCAL_MACHINE, "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey);

        if (error == ERROR_SUCCESS)
        {
            RegQueryValueEx(hKey, "~MHz", NULL, NULL, (LPBYTE)&speed, &dataSize);
        }

        return (uint)speed;
    }

    void PlayFabDataGatherer::GatherData(PlayFabDataGatherer::DataMap& dataMap)
    {
        auto system = static_cast<CSystem*>(GetISystem());
        auto console = gEnv->pConsole;

        // Application Info
        dataMap["ProductName"] = AZStd::string(console->GetCVar("sys_game_name")->GetString());
        auto& productVersion = system->GetProductVersion();
        dataMap["Version"] = AZStd::string::format("%d.%d.%d.%d", productVersion[3], productVersion[2], productVersion[1], productVersion[0]);
        auto& lumberyardVersion = system->GetBuildVersion();
        dataMap["LumberyardVersion"] = AZStd::string::format("%d.%d.%d.%d", lumberyardVersion[3], lumberyardVersion[2], lumberyardVersion[1], lumberyardVersion[0]);

#if defined (AZ_PLATFORM_WINDOWS)
        dataMap["RuntimePlatform"] = AZStd::string("Windows");
        dataMap["DeviceType"] = AZStd::string("Desktop");
#elif defined (AZ_PLATFORM_LINUX)
        dataMap["RuntimePlatform"] = AZStd::string("Linux");
        dataMap["DeviceType"] = AZStd::string("Desktop");
#elif defined (AZ_PLATFORM_ANDROID)
        dataMap["RuntimePlatform"] = AZStd::string("Android");
        dataMap["DeviceType"] = AZStd::string("Handheld");
#elif defined (AZ_PLATFORM_APPLE_OSX)
        dataMap["RuntimePlatform"] = AZStd::string("OSX");
        dataMap["DeviceType"] = AZStd::string("Desktop");
#elif defined (AZ_PLATFORM_APPLE_TV)
        dataMap["RuntimePlatform"] = AZStd::string("tvOS");
        dataMap["DeviceType"] = AZStd::string("Console");
#elif defined (AZ_PLATFORM_APPLE_IOS)
        dataMap["RuntimePlatform"] = AZStd::string("iOS");
        dataMap["DeviceType"] = AZStd::string("Handheld");
#elif defined (AZ_PLATFORM_PS3)
        dataMap["RuntimePlatform"] = AZStd::string("PS3");
        dataMap["DeviceType"] = AZStd::string("Console");
#elif defined (AZ_PLATFORM_PS4)
        dataMap["RuntimePlatform"] = AZStd::string("PS4");
        dataMap["DeviceType"] = AZStd::string("Console");
#elif defined (AZ_PLATFORM_X360)
        dataMap["RuntimePlatform"] = AZStd::string("Xbox360");
        dataMap["DeviceType"] = AZStd::string("Console");
#elif defined (AZ_PLATFORM_XBONE)
        dataMap["RuntimePlatform"] = AZStd::string("XboxOne");
        dataMap["DeviceType"] = AZStd::string("Console");
#elif defined (AZ_PLATFORM_WII)
        dataMap["RuntimePlatform"] = AZStd::string("Wii");
        dataMap["DeviceType"] = AZStd::string("Console");
#endif

        // Device & OS
        SPlatformInfo::EWinVersion osVersion = SPlatformInfo::WinUndetected;
        bool osIs64Bit = false;
        char osName[1024];
        Win32SysInspect::GetOS(osVersion, osIs64Bit, osName, sizeof(osName));
        dataMap["OperatingSystem"] = AZStd::string(osName);

        // Graphics Abilities
        unsigned int gpuVendorId = 0, gpuDeviceId = 0, totVidMem = 0;
        Win32SysInspect::DXFeatureLevel featureLevel = Win32SysInspect::DXFL_Undefined;
        char gpuDeviceName[512];
        Win32SysInspect::GetGPUInfo(gpuDeviceName, sizeof(gpuDeviceName), gpuVendorId, gpuDeviceId, totVidMem, featureLevel);
        dataMap["GraphicsDeviceId"] = AZStd::string::format("0x%04X", gpuDeviceId);
        dataMap["GraphicsVendorId"] = AZStd::string::format("0x%04X", gpuVendorId);
        dataMap["GraphicsDeviceName"] = AZStd::string(gpuDeviceName);
        dataMap["GraphicsMemorySize"] = AZStd::to_string(totVidMem >> 20);
        switch (featureLevel)
        {
        case Win32SysInspect::DXFL_9_1:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D9.1");
            dataMap["GraphicsShaderLevel"] = AZStd::string("2.0");
            break;
        }
        case Win32SysInspect::DXFL_9_2:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D9.2");
            dataMap["GraphicsShaderLevel"] = AZStd::string("2.0");
            break;
        }
        case Win32SysInspect::DXFL_9_3:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D9.3");
            dataMap["GraphicsShaderLevel"] = AZStd::string("2.x");
            break;
        }
        case Win32SysInspect::DXFL_10_0:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D10.0");
            dataMap["GraphicsShaderLevel"] = AZStd::string("4.0");
            break;
        }
        case Win32SysInspect::DXFL_10_1:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D10.1");
            dataMap["GraphicsShaderLevel"] = AZStd::string("4.x");
            break;
        }
        case Win32SysInspect::DXFL_11_0:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Direct3D11.0");
            dataMap["GraphicsShaderLevel"] = AZStd::string("5.0");
            break;
        }
        case Win32SysInspect::DXFL_Undefined:
        default:
        {
            dataMap["GraphicsDeviceType"] = AZStd::string("Unknown");
            dataMap["GraphicsShaderLevel"] = AZStd::string("Unknown");
            break;
        }
        }

        // System Info
        auto cpu = system->GetCPUFeatures();
        dataMap["ProcessorCount"] = AZStd::to_string(cpu->GetCPUCount());
        dataMap["LogicalProcessorCount"] = AZStd::to_string(cpu->GetLogicalCPUCount());
        dataMap["ProcessorType"] = AZStd::string(cpu->m_Cpu[0].mCpuType);
        dataMap["ProcessorVendor"] = AZStd::string(cpu->m_Cpu[0].mVendor);
        dataMap["ProcessorFrequency"] = AZStd::to_string(ProcSpeedRead());
        MEMORYSTATUSEX memory;
        memory.dwLength = sizeof(memory);
        GlobalMemoryStatusEx(&memory);
        dataMap["SystemMemorySize"] = AZStd::to_string(memory.ullTotalPhys >> 20);
    }

    AZStd::string PlayFabDataGatherer::GenerateReport(PlayFabDataGatherer::DataMap& dataMap)
    {
        std::ostringstream report;
        report << "Logging System Info: ========================================\n";

        for (auto& iter : dataMap)
        {
            auto& key = iter.first;
            auto& value = iter.second;
            report << "System Info - " << key.c_str() << ": " << static_cast<AZStd::string>(value).c_str() << "\n";
        }

        return report.str().c_str();
    }
}
