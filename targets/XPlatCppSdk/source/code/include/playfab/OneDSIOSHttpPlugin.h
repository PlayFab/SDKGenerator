#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabIOSHttpPlugin.h>

namespace PlayFab
{
    /// <summary>
    /// OneDSIOSHttpPlugin is an https implementation to interact with OneDS (One Data Collector) services using IOSHTTP.
    /// </summary>
    class OneDSIOSHttpPlugin : public PlayFabIOSHttpPlugin
    {
    public:
        OneDSIOSHttpPlugin() {}
        OneDSIOSHttpPlugin(const OneDSIOSHttpPlugin& other) = delete;
        OneDSIOSHttpPlugin& operator=(const OneDSIOSHttpPlugin&) = delete;
        OneDSIOSHttpPlugin(OneDSIOSHttpPlugin&& other) = delete;
        OneDSIOSHttpPlugin& operator=(OneDSIOSHttpPlugin&& other) = delete;
        virtual ~OneDSIOSHttpPlugin() override {}

    protected:
        virtual std::string GetUrl(RequestTask& requestTask) const override;
        virtual void SetPredefinedHeaders(RequestTask& requestTask, void* urlRequest) override;
        virtual bool GetBinaryPayload(RequestTask& requestTask, void*& payload, size_t& payloadSize) const override;
        virtual void ProcessResponse(RequestTask& requestTask, const int httpCode) override;
    };
}

#endif
