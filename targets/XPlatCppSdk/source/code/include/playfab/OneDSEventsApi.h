#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabEventsDataModels.h>
#include <playfab/PlayFabEvent.h>
#include <playfab/OneDSEventsDataModels.h>
#include <string>

namespace PlayFab
{
    /// <summary>
    /// OneDS-specific extension of WriteEventsResponse
    /// </summary>
    namespace EventsModels
    {
        struct OneDSWriteEventsResponse : public WriteEventsResponse
        {
            // Error wrapper that is relayed from CallRequestContainer to a user's success callback. 
            // That error wrapper contains HTTP response information that may be valuable also for successful callbacks.
            const PlayFabError* errorWrapper;
        };
    }

    /// <summary>
    /// Main interface for OneDS (One Data Collector) events APIs
    /// </summary>
    class OneDSEventsAPI
    {
    public:
        OneDSEventsAPI() {} // Default constructor
        size_t Update();
        void SetCredentials(const std::string& projectIdIkey, const std::string& ingestionKey, const std::string& jwtToken, const std::string& headerJwtTicketKey, const std::string& headerJwtTicketPrefix);
        void ForgetAllCredentials();
        bool GetIsOneDSAuthenticated() const;

        static void GetTelemetryIngestionConfig(EventsModels::TelemetryIngestionConfigRequest& request, ProcessApiCallback<EventsModels::TelemetryIngestionConfigResponse> callback, ErrorCallback errorCallback = nullptr, void* customData = nullptr);
        void WriteTelemetryEvents(EventsModels::WriteEventsRequest& request, ProcessApiCallback<EventsModels::OneDSWriteEventsResponse> callback, ErrorCallback errorCallback = nullptr, void* customData = nullptr);

    private:
        static void OnGetTelemetryIngestionConfigResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer);
        static void OnWriteTelemetryEventsResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer);
        static bool ValidateResult(PlayFabResultCommon& resultCommon, CallRequestContainer& container);

    private:
        bool isOneDSAuthenticated = false;
        std::string oneDSProjectIdIkey;
        std::string oneDSIngestionKey;

        // "Tickets" are a special HTTP header in a POST request to OneDS server, e.g.:
        // Tickets: "<ticket1_key>": "<ticket1_prefix>:<ticket1_value>";"<ticket2_key>": "<ticket2_prefix>:<ticket2_value>";...
        // JWT token is provided as one of the tickets, e.g.:
        // Tickets: "<oneDSHeaderJwtTicketKey>": "<oneDSHeaderJwtTicketPrefix>:<oneDSJwtToken>"; ...
        std::string oneDSJwtToken;
        std::string oneDSHeaderJwtTicketKey;
        std::string oneDSHeaderJwtTicketPrefix;
    };
}

#endif
