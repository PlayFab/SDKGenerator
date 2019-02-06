using System.Collections.Generic;
using System.Threading.Tasks;
using PlayFab.Logger;
using PlayFab.Pipeline;

namespace PlayFab
{
    /// <summary>
    /// The enumeration of all built-in event pipelines
    /// </summary>
    public enum EventPipelineKey
    {
        PlayFab, // PlayFab event pipeline
        OneDS // OneDS (One Collector) event pipeline
    }

    /// <summary>
    /// Interface for any event router
    /// </summary>
    public interface IPlayFabEventRouter
    {
        IDictionary<EventPipelineKey, IEventPipeline> Pipelines { get; }
        IEnumerable<Task<IPlayFabEmitEventResponse>> RouteEvent(IPlayFabEmitEventRequest request); // Route an event to pipelines. This method must be thread-safe.
    }

    /// <summary>
    /// Default implementation of event router
    /// </summary>
    public class PlayFabEventRouter : IPlayFabEventRouter
    {
        /// <summary>
        /// Gets the event pipelines
        /// </summary>
        public IDictionary<EventPipelineKey, IEventPipeline> Pipelines { get; private set; }

        /// <summary>
        /// Creates an instance of the event router
        /// </summary>
        public PlayFabEventRouter()
        {
            this.Pipelines = new Dictionary<EventPipelineKey, IEventPipeline>();
            this.Pipelines.Add(EventPipelineKey.OneDS, new OneDSEventPipeline(new OneDSEventPipelineSettings(), new DebugLogger()));  // add OneDS pipeline
        }

        public IEnumerable<Task<IPlayFabEmitEventResponse>> RouteEvent(IPlayFabEmitEventRequest request)
        {
            var tasks = new List<Task<IPlayFabEmitEventResponse>>();

            // only events based on PlayFabEmitEventRequest are supported by default pipelines
            var eventRequest = request as PlayFabEmitEventRequest;
            if (eventRequest != null && eventRequest.Event != null)
            {
                foreach (var pipeline in this.Pipelines)
                {
                    switch (eventRequest.Event.EventType)
                    {
                        case PlayFabEventType.Default:
                        case PlayFabEventType.Lightweight:
                            {
                                // route lightweight (and default) events to OneDS pipeline only
                                if (pipeline.Key == EventPipelineKey.OneDS)
                                {
                                    tasks.Add(pipeline.Value.IntakeEventAsync(request));
                                }
                                break;
                            }
                        default:
                            {
                                // do not route unsupported types of events
                                break;
                            }
                    }
                }
            }

            return tasks;
        }
    }
}