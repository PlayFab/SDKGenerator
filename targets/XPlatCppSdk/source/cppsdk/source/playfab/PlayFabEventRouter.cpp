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
        this->pipelines.emplace(0, std::move(std::shared_ptr<PlayFabEventPipeline>(new PlayFabEventPipeline(std::shared_ptr<PlayFabEventPipelineSettings>(new PlayFabEventPipelineSettings()))))); // add PlayFab pipeline by default
    }

    void PlayFabEventRouter::RouteEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) const
    {
        // implement routing to all pipelines (by default)
        for (auto& pipelineEntry : this->pipelines)
        {
            pipelineEntry.second->IntakeEvent(request);
        }
    }
}

#endif