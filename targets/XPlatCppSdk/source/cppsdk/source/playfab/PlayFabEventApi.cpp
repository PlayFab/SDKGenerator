#include <stdafx.h>

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabEventApi.h>

namespace PlayFab
{
    PlayFabEventAPI::PlayFabEventAPI() :
        eventRouter(std::shared_ptr<PlayFabEventRouter>(new PlayFabEventRouter())) // default event router
    {
    }

    std::shared_ptr<IPlayFabEventRouter> PlayFabEventAPI::GetEventRouter() const
    {
        return this->eventRouter;
    }

    void PlayFabEventAPI::EmitEvent(std::unique_ptr<const IPlayFabEvent> event, const PlayFabEmitEventCallback callback) const
    {
        auto eventRequest = std::shared_ptr<PlayFabEmitEventRequest>(new PlayFabEmitEventRequest());
        std::shared_ptr<const IPlayFabEvent> sharedGenericEvent = std::move(event);
        eventRequest->event = std::dynamic_pointer_cast<const PlayFabEvent>(sharedGenericEvent);
        eventRequest->callback = callback;

        this->eventRouter->RouteEvent(eventRequest);
    }
}

#endif
