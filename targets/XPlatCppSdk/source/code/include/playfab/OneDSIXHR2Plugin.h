#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#include <thread>
#include <mutex>

namespace PlayFab
{
    /// <summary>
    /// OneDSIXHR2Plugin is the default https implementation to interact with OneDS (One Data Collector) services on Xbox using IXHR2 API
    /// </summary>
    class OneDSIXHR2Plugin : public PlayFabIXHR2HttpPlugin
    {
    public:
        OneDSIXHR2Plugin() {}
        OneDSIXHR2Plugin(const OneDSIXHR2Plugin& other) = delete;
        OneDSIXHR2Plugin& operator=(const OneDSIXHR2Plugin&) = delete;
        OneDSIXHR2Plugin(OneDSIXHR2Plugin&& other) = delete;
        OneDSIXHR2Plugin& operator=(OneDSIXHR2Plugin&& other) = delete;
        virtual ~OneDSIXHR2Plugin() override {}

    protected:
        void SetupRequestHeaders(const OneDSCallRequestContainer& reqContainer, std::vector<HttpHeaderInfo>& headers);
        virtual void ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer) override;
    };
}

#endif