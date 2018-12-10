#pragma once

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabEventsApi.h>
#include <playfab/PlayFabEventsDataModels.h>
#include <playfab/PlayFabTelemetryEventsDataModels.h>

namespace PlayFab
{
    /// <summary>
    /// Main interface for PlayFab Sdk, specifically all Telemetry Events APIs.
    /// </summary>
    class PlayFabTelemetryEventsAPI: public PlayFabEventsAPI
    {
    public:
        static void GetTelemetryIngestionConfig(EventsModels::TelemetryIngestionConfigRequest& request, ProcessApiCallback<EventsModels::TelemetryIngestionConfigResponse> callback, ErrorCallback errorCallback = nullptr, void* customData = nullptr);
        static void WriteTelemetryEvents(EventsModels::WriteEventsRequest& request, ProcessApiCallback<EventsModels::WriteEventsResponse> callback, ErrorCallback errorCallback = nullptr, void* customData = nullptr);

    private:
        PlayFabTelemetryEventsAPI(); // Private constructor, static class should never have an instance
        PlayFabTelemetryEventsAPI(const PlayFabTelemetryEventsAPI& other); // Private copy-constructor, static class should never have an instance

        static void OnGetTelemetryIngestionConfigResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer);
        static void OnWriteTelemetryEventsResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer);

        static bool ValidateResult(PlayFabResultCommon& resultCommon, CallRequestContainer& container);
    };
}

#endif
