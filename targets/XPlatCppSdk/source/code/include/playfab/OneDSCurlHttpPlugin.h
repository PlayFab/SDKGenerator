#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabCurlHttpPlugin.h>
#include <thread>
#include <mutex>

namespace PlayFab
{
    /// <summary>
    /// OneDSCurlHttpPlugin is an https implementation to interact with OneDS (One Data Collector) services using curl.
    /// </summary>
    class OneDSCurlHttpPlugin : public PlayFabCurlHttpPlugin
    {
    public:
        OneDSCurlHttpPlugin() {}
        OneDSCurlHttpPlugin(const OneDSCurlHttpPlugin& other) = delete;
        OneDSCurlHttpPlugin& operator=(const OneDSCurlHttpPlugin&) = delete;
        OneDSCurlHttpPlugin(OneDSCurlHttpPlugin&& other) = delete;
        OneDSCurlHttpPlugin& operator=(OneDSCurlHttpPlugin&& other) = delete;
        virtual ~OneDSCurlHttpPlugin() override {}

    protected:
        virtual void ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer) override;
    };
}

#endif