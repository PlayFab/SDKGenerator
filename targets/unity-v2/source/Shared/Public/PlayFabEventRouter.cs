#if NET_4_6   
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
        Task AddAndStartPipeline(EventPipelineKey eventPipelineKey, IEventPipeline eventPipeline);
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
        
        private ILogger logger;

        /// <summary>
        /// Creates an instance of the event router
        /// </summary>
        public PlayFabEventRouter(ILogger logger = null)
        {
            if(logger == null) logger = new DebugLogger();
            this.logger = logger;
            this.Pipelines = new Dictionary<EventPipelineKey, IEventPipeline>();
        }

        /// <summary>
        /// Adds and starts an event pipeline.
        /// </summary>
        /// <param name="eventPipelineKey">The event pipeline key.</param>
        /// <param name="eventPipeline">The event pipeline.</param>
        /// <returns>A task that runs while the pipeline is active.</returns>
        public Task AddAndStartPipeline(EventPipelineKey eventPipelineKey, IEventPipeline eventPipeline)
        {
            this.Pipelines.Add(eventPipelineKey, eventPipeline);
            return eventPipeline.StartAsync();
        }

        public IEnumerable<Task<IPlayFabEmitEventResponse>> RouteEvent(IPlayFabEmitEventRequest request)
        {
            var tasks = new List<Task<IPlayFabEmitEventResponse>>();

            // only events based on PlayFabEmitEventRequest are supported by default pipelines
            var eventRequest = request as PlayFabEmitEventRequest;

            if ( eventRequest == null || eventRequest.Event == null ) return tasks;

            foreach (var pipeline in this.Pipelines)
            {
                switch (eventRequest.Event.EventType)
                {
                    case PlayFabEventType.Default:
                    case PlayFabEventType.Lightweight:
                        // route lightweight (and default) events to OneDS pipeline only
                        if (pipeline.Key == EventPipelineKey.OneDS)
                        {
                            tasks.Add(pipeline.Value.IntakeEventAsync(request));
                        }
                        break;
                    default:
                        logger.Error($"Not supported event type {eventRequest.Event.EventType}.");
                        break;
                }
            }

            return tasks;
        }
    }
}
#endif