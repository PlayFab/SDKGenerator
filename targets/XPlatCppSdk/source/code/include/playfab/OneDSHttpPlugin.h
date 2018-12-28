#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabHttp.h>
#include <thread>
#include <mutex>

namespace PlayFab
{
    /// <summary>
    /// OneDSHttpPlugin is an https implementation to interact with OneDS (One Data Collector) services using curl.
    /// </summary>
    class OneDSHttpPlugin : public PlayFabHttp
    {
    public:
        OneDSHttpPlugin() {}
        OneDSHttpPlugin(const OneDSHttpPlugin& other) = delete;
        OneDSHttpPlugin& operator=(const OneDSHttpPlugin&) = delete;
        OneDSHttpPlugin(OneDSHttpPlugin&& other) = delete;
        OneDSHttpPlugin& operator=(OneDSHttpPlugin&& other) = delete;
        virtual ~OneDSHttpPlugin() override {}

    protected:
        virtual void ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer) override;
    };
}

#endif