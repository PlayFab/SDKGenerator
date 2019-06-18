#pragma once

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSEventsApi.h>
#include <playfab/PlayFabEventPipeline.h>

namespace PlayFab
{
    /// <summary>
    /// Settings for OneDS event pipeline
    /// </summary>
    class OneDSEventPipelineSettings: public PlayFabEventPipelineSettings
    {
    };

    /// <summary>
    /// Implementation of OneDS event pipeline
    /// </summary>
    class OneDSEventPipeline: public PlayFabEventPipeline
    {
    public:
        explicit OneDSEventPipeline(std::shared_ptr<OneDSEventPipelineSettings> settings);

        OneDSEventPipeline(const OneDSEventPipeline& source) = delete; // disable copy
        OneDSEventPipeline(OneDSEventPipeline&&) = delete; // disable move
        OneDSEventPipeline& operator=(const OneDSEventPipeline& source) = delete; // disable assignment
        OneDSEventPipeline& operator=(OneDSEventPipeline&& other) = delete; // disable move assignment

        std::shared_ptr<OneDSEventPipelineSettings> GetSettings() const;

    protected:
        virtual void SendBatch(size_t& batchCounter) override;

    private:
        bool AuthenticateOneDSApi(void* customData);
        void WriteTelemetryEventsApiCallback(const EventsModels::OneDSWriteEventsResponse& result, void* customData);
        void WriteTelemetryEventsApiErrorCallback(const PlayFabError& error, void* customData);

    private:
        OneDSEventsAPI oneDSEventsApi;
    };
}

#endif