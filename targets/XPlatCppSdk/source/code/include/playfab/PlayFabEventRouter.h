#pragma once

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabEvent.h>
#include <playfab/PlayFabEventPipeline.h>
#include <playfab/OneDSEventPipeline.h>

namespace PlayFab
{
    /// <summary>
    /// Interface for any event router
    /// </summary>
    class IPlayFabEventRouter
    {
    public:
        virtual ~IPlayFabEventRouter() {}
        virtual void RouteEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) const = 0; // Route an event to pipelines. This method must be thread-safe.
        const std::unordered_map<size_t, std::shared_ptr<IPlayFabEventPipeline>>& GetPipelines() const;

    protected:
        std::unordered_map<size_t, std::shared_ptr<IPlayFabEventPipeline>> pipelines;
    };

    /// <summary>
    /// Default implementation of event router
    /// </summary>
    class PlayFabEventRouter: public IPlayFabEventRouter
    {
    public:
        PlayFabEventRouter();
        virtual void RouteEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) const;
    private:
    };
}

#endif
