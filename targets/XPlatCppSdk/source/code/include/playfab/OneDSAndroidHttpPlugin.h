#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabAndroidHttpPlugin.h>

namespace PlayFab
{
    /// <summary>
    /// OneDSAndroidHttpPlugin is an https implementation to interact with OneDS (One Data Collector) services using okhttp3 though JNI.
    /// </summary>
    class OneDSAndroidHttpPlugin : public PlayFabAndroidHttpPlugin
    {
    public:
        OneDSAndroidHttpPlugin() {}
        OneDSAndroidHttpPlugin(const OneDSAndroidHttpPlugin& other) = delete;
        OneDSAndroidHttpPlugin& operator=(const OneDSAndroidHttpPlugin&) = delete;
        OneDSAndroidHttpPlugin(OneDSAndroidHttpPlugin&& other) = delete;
        OneDSAndroidHttpPlugin& operator=(OneDSAndroidHttpPlugin&& other) = delete;
        virtual ~OneDSAndroidHttpPlugin() override {}

    protected:
        virtual std::string GetUrl(RequestTask& requestTask) const override;
        virtual void SetPredefinedHeaders(RequestTask& requestTask) override;
        virtual bool GetBinaryPayload(RequestTask& requestTask, void*& payload, size_t& payloadSize) const override;
        virtual void ProcessResponse(RequestTask& requestTask, const int httpCode) override;
    };
}

#endif
