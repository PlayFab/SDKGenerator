#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabWinHttpPlugin.h>

namespace PlayFab
{
    /// <summary>
    /// OneDSWinHttpPlugin is an https implementation to interact with OneDS (One Data Collector) services using WinHTTP.
    /// </summary>
    class OneDSWinHttpPlugin : public PlayFabWinHttpPlugin
    {
    public:
        OneDSWinHttpPlugin() {}
        OneDSWinHttpPlugin(const OneDSWinHttpPlugin& other) = delete;
        OneDSWinHttpPlugin& operator=(const OneDSWinHttpPlugin&) = delete;
        OneDSWinHttpPlugin(OneDSWinHttpPlugin&& other) = delete;
        OneDSWinHttpPlugin& operator=(OneDSWinHttpPlugin&& other) = delete;
        virtual ~OneDSWinHttpPlugin() override {}

    protected:
        virtual std::string GetUrl(CallRequestContainer& requestContainer) const;
        virtual void SetPredefinedHeaders(CallRequestContainer& requestContainer, HINTERNET hRequest);
        virtual bool GetBinaryPayload(CallRequestContainer& requestContainer, LPVOID& payload, DWORD& payloadSize) const;
        virtual void ProcessResponse(CallRequestContainer& requestContainer, const int httpCode);
    };
}

#endif