#include <stdafx.h>

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabEventRouter.h>

namespace PlayFab
{
    const std::unordered_map<size_t, std::shared_ptr<IPlayFabEventPipeline>>& IPlayFabEventRouter::GetPipelines() const
    {
        return this->pipelines;
    }

    PlayFabEventRouter::PlayFabEventRouter()
    {
        this->pipelines.emplace(0, std::move(std::shared_ptr<PlayFabEventPipeline>(new PlayFabEventPipeline(std::shared_ptr<PlayFabEventPipelineSettings>(new PlayFabEventPipelineSettings()))))); // add PlayFab pipeline
        this->pipelines.emplace(1, std::move(std::shared_ptr<OneDSEventPipeline>(new OneDSEventPipeline(std::shared_ptr<OneDSEventPipelineSettings>(new OneDSEventPipelineSettings()))))); // add OneDS pipeline
    }

    void PlayFabEventRouter::RouteEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) const
    {
        // only events based on PlayFabEmitEventRequest are supported by default pipelines
        const PlayFabEmitEventRequest* pfRequestPtr = dynamic_cast<const PlayFabEmitEventRequest*>(request.get());
        if (pfRequestPtr != nullptr)
        {
            for (auto& pipelineEntry : this->pipelines)
            {
                switch (pfRequestPtr->event->eventType)
                {
                    case PlayFabEventType::Default:
                    case PlayFabEventType::Lightweight:
                    {
                        // route lightweight (and default) events to OneDS pipeline only
                        if (pipelineEntry.first == 1)
                        {
                            pipelineEntry.second->IntakeEvent(request);
                        }
                        break;
                    }
                    case PlayFabEventType::Heavyweight:
                    {
                        // route heavyweight events to PlayFab pipeline only
                        if (pipelineEntry.first == 0)
                        {
                            pipelineEntry.second->IntakeEvent(request);
                        }
                        break;
                    }
                    default:
                    {
                        // do not route unsupported types of events
                    }
                }
            }
        }
    }
}

#endif