#pragma once

#ifndef DISABLE_PLAYFABENTITY_API

// define body for logging or debug output
#define LOG_PIPELINE(S) /*std::cout << S*/

#include <playfab/PlayFabEvent.h>
#include <playfab/PlayFabEventBuffer.h>
#include <playfab/PlayFabAuthenticationContext.h>
#include <mutex>

namespace PlayFab
{
    /// <summary>
    /// Settings for any event pipeline
    /// </summary>
    class PlayFabEventPipelineSettings
    {
    public:
        PlayFabEventPipelineSettings();
        virtual ~PlayFabEventPipelineSettings() {};

        size_t bufferSize; // The minimal size of buffer, in bytes. The actually allocated size will be a power of 2 that is equal or greater than this value.
        size_t maximalNumberOfItemsInBatch; // The maximal number of items (events) a batch can hold before it is sent out.
        size_t maximalBatchWaitTime; // The maximal wait time before a batch must be sent out even if it's still incomplete, in seconds.
        size_t maximalNumberOfRetries; // The maximal number of retries for transient transport errors, before a batch is discarded.
        size_t maximalNumberOfBatchesInFlight; // The maximal number of batches currently "in flight" (sent to a transport plugin).
        int64_t readBufferWaitTime; // The wait time between attempts to read events from buffer when it is empty, in milliseconds.
        std::shared_ptr<PlayFabAuthenticationContext> authenticationContext; // The optional PlayFab authentication context that can be used with static PlayFab events API
    };

    /// <summary>
    /// Interface for any event pipeline
    /// </summary>
    class IPlayFabEventPipeline
    {
    public:
        virtual ~IPlayFabEventPipeline() {}
        virtual void Start() {} // Start pipeline's worker thread
        virtual void IntakeEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) = 0; // Intake an event. This method must be thread-safe.
    };

    /// <summary>
    /// Implementation of PlayFab-specific event pipeline
    /// </summary>
    class PlayFabEventPipeline: public IPlayFabEventPipeline
    {
    public:
        explicit PlayFabEventPipeline(std::shared_ptr<PlayFabEventPipelineSettings> settings);
        virtual ~PlayFabEventPipeline() override;

        PlayFabEventPipeline(const PlayFabEventPipeline& source) = delete; // disable copy
        PlayFabEventPipeline(PlayFabEventPipeline&&) = delete; // disable move
        PlayFabEventPipeline& operator=(const PlayFabEventPipeline& source) = delete; // disable assignment
        PlayFabEventPipeline& operator=(PlayFabEventPipeline&& other) = delete; // disable move assignment

        std::shared_ptr<PlayFabEventPipelineSettings> GetSettings() const;
        virtual void Start() override;
        virtual void IntakeEvent(std::shared_ptr<const IPlayFabEmitEventRequest> request) override;

        void SetExceptionCallback(ExceptionCallback callback);

    protected:
        virtual void SendBatch(size_t& batchCounter);

    private:
        void WorkerThread();        
        void WriteEventsApiCallback(const EventsModels::WriteEventsResponse& result, void* customData);
        void WriteEventsApiErrorCallback(const PlayFabError& error, void* customData);

    protected:
        // PlayFab's public Events API (e.g. WriteEvents method) allows to pass only a pointer to some custom object (void* customData) that will be relayed back to its callbacks. 
        // This is the only reliable way to relate a particular Events API call with its particular callbacks since it is an asynchronous operation.
        // We are using that feature (custom pointer relay) because we need to know which batch it was when we receive a callback from the Events API.
        // To keep track of all batches currently in flight (i.e. those for which we called Events API) we need to have a container with controllable size
        // that would allow to quickly map a pointer (like void* customData) to a batch (like a std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>).
        std::unordered_map<void*, std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>>> batchesInFlight;
        std::vector<std::shared_ptr<const IPlayFabEmitEventRequest>> batch;

    private:
        std::shared_ptr<PlayFabEventPipelineSettings> settings;
        PlayFabEventBuffer buffer;
        std::thread workerThread;
        std::atomic<bool> isWorkerThreadRunning;
        std::mutex userExceptionCallbackMutex;
        ExceptionCallback userExceptionCallback;
    };
}

#endif
