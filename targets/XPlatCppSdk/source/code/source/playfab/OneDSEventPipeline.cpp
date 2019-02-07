#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSEventsDataModels.h>
#include <playfab/OneDSEventPipeline.h>
#include <playfab/OneDSEventsApi.h>

#pragma warning (disable: 4100) // formal parameters are part of a public interface

namespace PlayFab
{
    OneDSEventPipeline::OneDSEventPipeline(std::shared_ptr<OneDSEventPipelineSettings> settings) :
        PlayFabEventPipeline(settings)
    {
    }

    std::shared_ptr<OneDSEventPipelineSettings> OneDSEventPipeline::GetSettings() const
    {
        return std::dynamic_pointer_cast<OneDSEventPipelineSettings>(PlayFabEventPipeline::GetSettings());
    }

    void OneDSEventPipeline::SendBatch(size_t& batchCounter)
    {
        // create a WriteTelemetryEvents API request to send the batch
        EventsModels::WriteEventsRequest batchReq;
        for (const auto& eventEmitRequest : this->batch)
        {
            const auto& playFabEmitRequest = std::dynamic_pointer_cast<const PlayFabEmitEventRequest>(eventEmitRequest);
            batchReq.Events.push_back(playFabEmitRequest->event->eventContents);
        }

        // add batch to flight tracking map
        void* customData = reinterpret_cast<void*>(batchCounter); // used to track batches across asynchronous OneDS Events API
        this->batchesInFlight[customData] = std::move(this->batch);
        batchCounter++;

        this->batch.clear(); // batch vector will be reused
        this->batch.reserve(this->GetSettings()->maximalNumberOfItemsInBatch);

        // authenticate OneDS API client as needed
        if (!oneDSEventsApi.GetIsOneDSAuthenticated())
        {
            if (!AuthenticateOneDSApi(customData))
                return;
        }

        // call OneDS Events API to send the batch
        oneDSEventsApi.WriteTelemetryEvents(
            batchReq,
            std::bind(&OneDSEventPipeline::WriteTelemetryEventsApiCallback, this, std::placeholders::_1, std::placeholders::_2), // bind instance method of this class as a success callback
            std::bind(&OneDSEventPipeline::WriteTelemetryEventsApiErrorCallback, this, std::placeholders::_1, std::placeholders::_2), // bind instance method of this class as an error callback
            customData);
    }

    bool OneDSEventPipeline::AuthenticateOneDSApi(void* customData)
    {
        // Get OneDS context
        std::shared_ptr<bool> operationComplete = std::shared_ptr<bool>(new bool(false));
        std::shared_ptr<bool> isOneDSAuthenticated = std::shared_ptr<bool>(new bool(false));
        EventsModels::TelemetryIngestionConfigRequest configRequest;
        if (this->GetSettings()->authenticationContext != nullptr)
        {
            configRequest.authenticationContext = this->GetSettings()->authenticationContext;
        }

        OneDSEventsAPI::GetTelemetryIngestionConfig(configRequest,
            [&](const PlayFab::EventsModels::TelemetryIngestionConfigResponse& result, void* relayedCustomData)
            {
                oneDSEventsApi.SetCredentials("o:" + result.TenantId, result.IngestionKey, result.TelemetryJwtToken, result.TelemetryJwtHeaderKey, result.TelemetryJwtHeaderPrefix);
                *isOneDSAuthenticated = true;
                *operationComplete = true;
            },
            [&](const PlayFab::PlayFabError& error, void* relayedCustomData)
            {
                // failed to get OneDS context info (including credentials), relay error to user
                WriteTelemetryEventsApiErrorCallback(error, customData);
                *isOneDSAuthenticated = false;
                *operationComplete = true;
            });

        auto checkWaitSpan = std::chrono::milliseconds(this->GetSettings()->readBufferWaitTime);
        while (!(*operationComplete))
        {
            std::this_thread::sleep_for(checkWaitSpan);
        }

        return *isOneDSAuthenticated;
    }

    void OneDSEventPipeline::WriteTelemetryEventsApiCallback(const EventsModels::OneDSWriteEventsResponse& result, void* customData)
    {
        try
        {
            // batch was successfully sent out, find it in the batch tracking map using customData pointer as a key
            auto foundBatchIterator = this->batchesInFlight.find(customData);
            if (foundBatchIterator == this->batchesInFlight.end())
            {
                LOG_PIPELINE("Untracked batch was returned to OneDSEventsAPI.WriteTelemetryEvents callback"); // normally this never happens
            }
            else
            {
                auto requestBatchPtr = std::shared_ptr<const std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>>(new std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>(std::move(foundBatchIterator->second)));

                // call individual emit event callbacks
                for (const auto& eventEmitRequest : *requestBatchPtr)
                {
                    const auto& playFabEmitRequest = std::dynamic_pointer_cast<const PlayFabEmitEventRequest>(eventEmitRequest);
                    auto playFabEmitEventResponse = std::shared_ptr<PlayFabEmitEventResponse>(new PlayFabEmitEventResponse());
                    playFabEmitEventResponse->emitEventResult = EmitEventResult::Success;
                    playFabEmitEventResponse->playFabError = std::shared_ptr<PlayFabError>(new PlayFabError(*result.errorWrapper));
                    playFabEmitEventResponse->writeEventsResponse = std::shared_ptr<EventsModels::WriteEventsResponse>(new EventsModels::WriteEventsResponse(result));
                    playFabEmitEventResponse->batch = requestBatchPtr;
                    playFabEmitEventResponse->batchNumber = reinterpret_cast<size_t>(customData);

                    // call an emit event callback
                    try
                    {
                        playFabEmitRequest->callback(playFabEmitRequest->event, std::move(playFabEmitEventResponse));
                    }
                    catch (...)
                    {
                        LOG_PIPELINE("An exception originated in user's success callback method");
                    }
                }

                // remove the batch from tracking map
                this->batchesInFlight.erase(foundBatchIterator->first);
            }
        }
        catch (...)
        {
            LOG_PIPELINE("An exception was caught in OneDSEventPipeline::WriteEventsApiCallback method");
        }
    }

    void OneDSEventPipeline::WriteTelemetryEventsApiErrorCallback(const PlayFabError& error, void* customData)
    {
        try
        {
            // batch wasn't sent out due to an error, find it in the batch tracking map using customData pointer as a key
            auto foundBatchIterator = this->batchesInFlight.find(customData);
            if (foundBatchIterator == this->batchesInFlight.end())
            {
                LOG_PIPELINE("Untracked batch was returned to OneDSEventsAPI.WriteTelemetryEvents callback"); // normally this never happens
            }
            else
            {
                auto requestBatchPtr = std::shared_ptr<const std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>>(new std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>(std::move(foundBatchIterator->second)));

                // call individual emit event callbacks
                for (const auto& eventEmitRequest : *requestBatchPtr)
                {
                    const auto& playFabEmitRequest = std::dynamic_pointer_cast<const PlayFabEmitEventRequest>(eventEmitRequest);
                    auto playFabEmitEventResponse = std::shared_ptr<PlayFabEmitEventResponse>(new PlayFabEmitEventResponse());
                    playFabEmitEventResponse->emitEventResult = EmitEventResult::Success;
                    playFabEmitEventResponse->playFabError = std::shared_ptr<PlayFabError>(new PlayFabError(error));
                    playFabEmitEventResponse->batch = requestBatchPtr;
                    playFabEmitEventResponse->batchNumber = reinterpret_cast<size_t>(customData);

                    // call an emit event callback
                    try
                    {
                        playFabEmitRequest->callback(playFabEmitRequest->event, std::move(playFabEmitEventResponse));
                    }
                    catch (...)
                    {
                        LOG_PIPELINE("An exception originated in user's error callback method");
                    }
                }

                // remove the batch from tracking map
                this->batchesInFlight.erase(foundBatchIterator->first);
            }
        }
        catch (...)
        {
            LOG_PIPELINE("An exception was caught in OneDSEventPipeline::WriteEventsApiErrorCallback method");
        }
    }
}

#endif