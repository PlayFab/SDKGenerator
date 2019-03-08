﻿﻿#if NET_4_6   
using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using PlayFab.EventsModels;
using PlayFab.Logger;
using PlayFab.SharedModels;

namespace PlayFab.Pipeline
{
    /// <summary>
    /// The implementation of an event pipeline that manages work of multiple event processing stages
    /// such as writings events, batching and sending over network.
    /// The public methods of this class are meant to be thread-safe and can be called from multiple threads.
    /// </summary>
    public class OneDSEventPipeline : IEventPipeline, IDisposable
    {
        // A flag that indicates whether the pipeline is currently active (started)
        // and accepts incoming data (events).
        private volatile bool isActive;
        private object isActiveLock = new object();

        private OneDSEventPipelineSettings settings;

        // External cancellation token is used to cancel the pipeline from outside code
        private CancellationToken externalCancellationToken;

        // Pipeline creates and uses its own internal cancellation token source (based on the external token)
        // to be able to communicate a cancellation between its stages when the cancellation needs to happen
        // inside the pipeline itself (for example, when an exception occurs). Cancellation in this case 
        // is needed to unblock all stage threads from waiting on data in the buffers.
        //
        // More about C# pipelines, their cancellation and error handling see here:
        // https://msdn.microsoft.com/en-us/library/ff963548.aspx
        private CancellationTokenSource pipelineCancellationTokenSource;

        // Buffers used in the pipeline
        private BlockingCollection<IPlayFabEmitEventRequest> eventBuffer;
        private BlockingCollection<TitleEventBatch> batchBuffer;
        private BlockingCollection<PlayFabResult<WriteEventsResponse>> sendResultBuffer;

        // Stages used in the pipeline
        private IPipelineStage<IPlayFabEmitEventRequest, TitleEventBatch> batchingStage;
        private IPipelineStage<TitleEventBatch, PlayFabResult<WriteEventsResponse>> sendingStage;

        // references to individual stages of the pipeline task
        private Task batchingTask; 
        private Task sendingTask;

        // The composition of all pipeline tasks including stages
        private Task pipelineTask;

        private ILogger logger;

        public OneDSEventPipelineSettings Settings
        {
            get
            {
                return this.settings;
            }
        }

        public Task PipelineTask
        {
            get
            {
                return this.pipelineTask;
            }
        }

        /// <summary>
        /// Creates an instance of EventPipeline.
        /// </summary>
        /// <param name="settings">The configuration settings for event pipeline.</param>
        public OneDSEventPipeline(OneDSEventPipelineSettings settings, ILogger logger)
        {
            if (settings == null)
                throw new ArgumentNullException(nameof(settings));
            this.settings = settings;

            if (logger == null)
                throw new ArgumentNullException(nameof(logger));
            this.logger = logger;
            
            this.batchingStage = new EventBatchingStage(this.settings.BatchSize, this.settings.BatchFillTimeout, logger);
            this.sendingStage = new EventSendingStage(logger);
        }

        /// <summary>
        /// Starts the pipeline (when external code doesn't care about canceling it with a token).
        /// </summary>
        public async Task StartAsync()
        {
            try
            {
                this.ThrowIfDisposed();
                await this.StartAsync(new CancellationToken());
            }
            catch (Exception e)
            {
                logger.Error($"Exception in StartAsync (without cancellation token) from {e.Source} with message: {e.Message}");
            }
        }

        /// <summary>
        /// Starts the pipeline.
        /// </summary>
        /// <param name="cancellationToken">A cancellation token to stop the pipeline from external code.</param>
        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                this.ThrowIfDisposed();
                lock (this.isActiveLock)
                {
                    if (this.isActive)
                    {
                        logger.Error("Event pipeline is already active");
                        return;
                    }

                    this.eventBuffer = new BlockingCollection<IPlayFabEmitEventRequest>(this.settings.EventBufferSize);
                    this.batchBuffer = new BlockingCollection<TitleEventBatch>(this.settings.BatchBufferSize);
                    this.sendResultBuffer = new BlockingCollection<PlayFabResult<WriteEventsResponse>>(1);

                    this.externalCancellationToken = cancellationToken;
                    this.pipelineCancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(this.externalCancellationToken);

                    this.ResetPipelineTask();
                    this.isActive = true;
                }

                await this.pipelineTask;
            }
            catch (Exception e)
            {
                logger.Error($"Exception in StartAsync (with cancellation token) from {e.Source} with message: {e.Message}");
            }
        }


        /// <summary>
        /// Stops the pipeline. It uses a cancellation token and is not an immediate process (soft stop).
        /// After it completes the user will need to call StartAsync to start the pipeline again if needed.
        /// </summary>
        public void Stop()
        {
            try
            {
                this.ThrowIfDisposed();
                lock (this.isActiveLock)
                {
                    if (!this.isActive)
                    {
                        logger.Warning("Event pipeline is already not active");
                    }

                    this.Cancel();
                    this.isActive = false;
                }
            }
            catch (Exception e)
            {
                logger.Error($"Exception in Stop from {e.Source} with message: {e.Message}");
            }
        }

        /// <summary>
        /// Signals the pipeline that it shouldn't wait for any new incoming data anymore and process whatever is left in it (drain all buffers).
        /// This method returns immediately to the caller, but the pipeline continues processing its current workload.
        /// When it is done all stage tasks will complete.
        /// The user will need to call StartAsync to start the pipeline again if needed.
        /// </summary>
        public void Complete()
        {
            try
            {
                this.ThrowIfDisposed();
                lock (this.isActiveLock)
                {
                    if (!this.isActive)
                    {
                        logger.Warning("Event pipeline is already not active");
                    }

                    this.eventBuffer.CompleteAdding();
                    this.isActive = false;
                }
            }
            catch (Exception e)
            {
                logger.Error($"Exception in Complete from {e.Source} with message: {e.Message}");
            }
        }

        /// <summary>
        /// Writes an event into the pipeline. This method returns immediately.
        /// </summary>
        /// <param name="request">The emit event request</param>
        public bool IntakeEvent(IPlayFabEmitEventRequest request)
        {
            try
            {
                this.ThrowIfDisposed();
                if (request == null)
                {
                    // We don't want to throw and break pipeline because of a bad event
                    logger.Error("Request passed to event pipeline is null");
                    return false;
                }

                if (!this.isActive)
                {
                    logger.Warning("Event pipeline is not active");
                    return false;
                }

                // Non-blocking add, return immediately and report a dropped event
                // if event buffer is full or marked as complete for adding.
                if (!this.eventBuffer.TryAdd(request))
                {
                    logger.Error("Event buffer is full or complete and event {0} cannot be added", ((PlayFabEmitEventRequest)request).Event.Name);
                    return false;
                }

                return true;
            }
            catch (Exception e)
            {
                logger.Error($"Exception in synchronous WriteEvent from {e.Source} with message: {e.Message}");
            }

            return false;
        }

        /// <summary>
        /// Writes an event into the pipeline and returns a task that allows user to wait for a result
        /// when this particular event is processed by pipeline and sent out to backend.
        /// </summary>
        /// <param name="request">The emit event request</param>
        /// <returns>A task that allows user to wait for a result.</returns>
        public async Task<IPlayFabEmitEventResponse> IntakeEventAsync(IPlayFabEmitEventRequest request)
        {
            try
            {
                this.ThrowIfDisposed();
                var resultPromise = new TaskCompletionSource<IPlayFabEmitEventResponse>();

                if (request == null)
                {
                    // We don't want to throw and break pipeline because of a bad event
                    logger.Error("Request passed to event pipeline is null");
                    resultPromise.SetCanceled();
                }
                else if (!this.isActive)
                {
                    logger.Warning("Event pipeline is not active");
                    resultPromise.SetCanceled();
                }

                // Non-blocking add, return immediately and report a dropped event
                // if event buffer is full or marked as complete for adding.
                else
                {
                    ((PlayFabEmitEventRequest)request).ResultPromise = resultPromise;
                    if (!this.eventBuffer.TryAdd(request))
                    {
                        logger.Error("Event buffer is full or complete and event {0} cannot be added", ((PlayFabEmitEventRequest)request).Event.Name);
                        resultPromise.SetCanceled();
                    }
                }

                return await resultPromise.Task;
            }
            catch (Exception e)
            {
                logger.Error($"Exception in IntakeEventAsync from {e.Source} with message: {e.Message}");
                var taskCompletionSource = new TaskCompletionSource<IPlayFabEmitEventResponse>();
                taskCompletionSource.SetResult(new PlayFabEmitEventResponse());
                return await taskCompletionSource.Task;
            }
        }

        private void Cancel()
        {
            this.eventBuffer?.CompleteAdding();

            // This should also direct all stages to mark their output buffers as complete for adding:
            this.pipelineCancellationTokenSource?.Cancel();
        }

        private void ThrowIfDisposed()
        {
            if (this.disposed)
            {
                throw new ObjectDisposedException(nameof(OneDSEventPipeline));
            }
        }

        #region IDisposable Support
        private bool disposed = false;

        protected virtual void Dispose(bool disposing)
        {
            if (!disposed)
            {
                if (disposing)
                {
                    this.Cancel();

                    // Free managed objects here including those that implement IDisposable
                    if (this.pipelineCancellationTokenSource != null)
                    {
                        this.pipelineCancellationTokenSource.Dispose();
                    }
                }

                // Free all references (assign nulls)
                this.pipelineCancellationTokenSource = null;
                disposed = true;
            }
        }

        public void Dispose()
        {
            try
            {
                this.Dispose(true);
                GC.SuppressFinalize(this);
            }
            catch (Exception e)
            {
                logger.Error($"Exception in Dispose from {e.Source} with message: {e.Message}");
            }
        }
        #endregion

        private void ResetPipelineTask()
        {
            this.ResetBatchingTask();
            this.ResetSendingTask();
            this.pipelineTask = Task.WhenAll(batchingTask, sendingTask);
        }

        private void ResetBatchingTask()
        {
            this.batchingTask = Task.Run(() => this.batchingStage.RunStage(this.eventBuffer, this.batchBuffer, this.pipelineCancellationTokenSource));
        }

        private void ResetSendingTask()
        {
            this.sendingTask = Task.Run(() => this.sendingStage.RunStage(this.batchBuffer, this.sendResultBuffer, this.pipelineCancellationTokenSource));
        }
    }
}
#endif