using System.Collections.Generic;
using System.Threading.Tasks;

namespace PlayFab
{
    /// <summary>
    /// Main interface for PlayFab Sdk, specifically all Lightweight/Heavyweight Event APIs.
    /// This class contains public methods of event API for single custom events.
    /// </summary>
    public class PlayFabEventAPI
    {
        /// <summary>
        /// Gets the event router
        /// </summary>
        public IPlayFabEventRouter EventRouter { get; private set; }

        /// <summary>
        /// Default constructor
        /// </summary>
        public PlayFabEventAPI()
        {
            this.EventRouter = new PlayFabEventRouter(); 
        }

        public IEnumerable<Task<IPlayFabEmitEventResponse>> EmitEvent(IPlayFabEvent playFabEvent)
        {
            var eventRequest = new PlayFabEmitEventRequest
            {
                Event = playFabEvent as PlayFabEvent
            };

            return this.EventRouter.RouteEvent(eventRequest);
        }
    }
}