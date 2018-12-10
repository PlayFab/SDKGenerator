#pragma once

#ifndef DISABLE_PLAYFABENTITY_API

#include <playfab/PlayFabEvent.h>
#include <playfab/PlayFabEventRouter.h>

namespace PlayFab
{
    /// <summary>
    /// Main interface for PlayFab Sdk, specifically all Lightweight/Heavyweight Event APIs.
    /// This class contains public methods of event API for single events.
    /// </summary>
    class PlayFabEventAPI
    {
    public:
        PlayFabEventAPI(); // Default constructor
        std::shared_ptr<IPlayFabEventRouter> GetEventRouter() const;

        /// <summary>
        /// Emits a single event.
        /// - event is a pointer to user's playstream event.
        /// - callback is a pointer to user's function to receive a notification about the outcome of the operation when the event is sent out or any error occurred.
        /// </summary>
        void EmitEvent(std::unique_ptr<const IPlayFabEvent> event, const PlayFabEmitEventCallback callback) const;

    private:
        std::shared_ptr<IPlayFabEventRouter> eventRouter;
    };
}

#endif
