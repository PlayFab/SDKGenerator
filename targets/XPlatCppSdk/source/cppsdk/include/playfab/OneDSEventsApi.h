#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabEventsDataModels.h>
#include <playfab/PlayFabEvent.h>
#include <string>

namespace PlayFab
{
    /// <summary>
    /// Main interface for OneDS (One Data Collector) events APIs
    /// </summary>
    class OneDSEventsAPI
    {
    public:
        OneDSEventsAPI() {} // Default constructor
        size_t Update();
        void SetCredentials(const std::string& oneDSProjectIdIkey, const std::string& oneDSIngestionKey);
        void ForgetAllCredentials();

        void WriteTelemetryEvents(EventsModels::WriteEventsRequest& request, ProcessApiCallback<EventsModels::WriteEventsResponse> callback, ErrorCallback errorCallback = nullptr, void* customData = nullptr);

    private:
        static void OnWriteTelemetryEventsResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer);
        static bool ValidateResult(PlayFabResultCommon& resultCommon, CallRequestContainer& container);

    private:
        bool isOneDSAuthenticated = false;
        std::string oneDSProjectIdIkey;
        std::string oneDSIngestionKey;
    };
}

#endif
