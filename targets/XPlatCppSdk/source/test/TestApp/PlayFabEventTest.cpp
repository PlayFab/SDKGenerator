// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <thread>
#include <chrono>
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabEventsApi.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/QoS/PlayFabQoSApi.h>
#include "PlayFabEventTest.h"
#include "TestContext.h"
#include "TestDataTypes.h"

using namespace PlayFab;
using namespace ClientModels;
using namespace EventsModels;

namespace PlayFabUnit
{
#if (!UNITY_IOS && !UNITY_ANDROID) && (!defined(PLAYFAB_PLATFORM_IOS) && !defined(PLAYFAB_PLATFORM_ANDROID))
    /// QoS API
    void PlayFabEventTest::QosResultApi(TestContext& testContext)
    {
        QoS::PlayFabQoSApi api;

        auto result = api.GetQoSResult(5, 200);

        if (result.errorCode == 0)
            testContext.Pass();
        else
            testContext.Fail("Error Code:" + std::to_string(result.errorCode));
    }
#endif

    /// EVENTS API
    /// Test that sends heavyweight events as a whole batch.
    static EventContents CreateEventContents(const std::string& eventName, int i)
    {
        PlayFab::EventsModels::EventContents event;
        std::stringstream name;
        name << eventName << i;
        event.Name = name.str();
        event.EventNamespace = "com.playfab.events.default";
        event.Payload["PropA"] = "prop-value-a";
        event.Payload["PropB"] = "prop-value-b";
        return event;
    }
    void PlayFabEventTest::EventsApi(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        EventsModels::WriteEventsRequest request;

        // send several events
        for (int i = 0; i < 2; i++)
        {
            request.Events.push_back(CreateEventContents("event_A_", i));
            request.Events.push_back(CreateEventContents("event_B_", i));
        }

        PlayFabEventsAPI::WriteEvents(request,
            Callback(&PlayFabEventTest::OnEventsApiSucceeded),
            Callback(&PlayFabEventTest::OnEventsApiFailed),
            &testContext);
    }
    void PlayFabEventTest::OnEventsApiSucceeded(const PlayFab::EventsModels::WriteEventsResponse&, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }
    void PlayFabEventTest::OnEventsApiFailed(const PlayFab::PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail(error.GenerateErrorReport());
    }

    /// EVENTS API
    /// Shared functions & data
    std::shared_ptr<TestContext*> PlayFabEventTest::eventTestContext;
    size_t PlayFabEventTest::eventBatchMax;
    int PlayFabEventTest::eventPassCount;
    int PlayFabEventTest::eventFailCount;
    std::string PlayFabEventTest::eventFailLog;

    void PlayFabEventTest::EmitEventCallback(std::shared_ptr<const PlayFab::IPlayFabEvent> event, std::shared_ptr<const PlayFab::IPlayFabEmitEventResponse> response)
    {
        auto pfEvent = std::dynamic_pointer_cast<const PlayFab::PlayFabEvent>(event);
        auto pfResponse = std::dynamic_pointer_cast<const PlayFab::PlayFabEmitEventResponse>(response);

        if (pfResponse->playFabError != nullptr)
        {
            // Handle successful event delivery.
            if (PlayFab::PlayFabErrorCode::PlayFabErrorSuccess == pfResponse->playFabError->ErrorCode)
            {
                ++eventPassCount;
                eventFailLog += pfEvent->GetName() + " was sent successfully " +
                    "in the batch #" + std::to_string(pfResponse->batchNumber) + " "
                    "of " + std::to_string(pfResponse->batch->size()) + " events. "
                    "HTTP code: " + std::to_string(pfResponse->playFabError->HttpCode) +
                    ", app error code: " + std::to_string(pfResponse->playFabError->ErrorCode) + "\n";

                // Keep track of the highest batch number.
                eventBatchMax = (pfResponse->batchNumber > eventBatchMax) ? pfResponse->batchNumber : eventBatchMax;
            }
            // Handle failed event delivery.
            else
            {
                ++eventFailCount;
                eventFailLog += pfEvent->GetName() + " received an error back " +
                    "in the batch #" + std::to_string(pfResponse->batchNumber) + " "
                    "of " + std::to_string(pfResponse->batch->size()) + " events. "
                    "HTTP code: " + std::to_string(pfResponse->playFabError->HttpCode) +
                    ", app error code: " + std::to_string(pfResponse->playFabError->ErrorCode) +
                    ", HTTP status: " + pfResponse->playFabError->HttpStatus +
                    ", Message: " + pfResponse->playFabError->ErrorMessage +
                    "\n";
            }
        }
        else 
        {
            (*eventTestContext)->Fail("EmitEventCallback received an error");
        }

        // Complete the test once all events have been processed.
        const int eventCount = eventPassCount + eventFailCount;
        if (eventCount >= eventEmitCount)
        {
            if (eventBatchMax >= eventEmitCount)
                (*eventTestContext)->Fail("Events did not batch:\n" + eventFailLog);
            else if (eventFailCount > 0)
                (*eventTestContext)->Fail("Events failed delivery:\n" + eventFailLog);
            else
                (*eventTestContext)->Pass();
        }
    }
    void PlayFabEventTest::EmitEvents(PlayFab::PlayFabEventType eventType)
    {
        // Emit several events quickly.
        // They will be batched up according to pipeline's settings
        for (int i = 0; i < eventEmitCount; i++)
        {
            auto event = std::unique_ptr<PlayFab::PlayFabEvent>(new PlayFab::PlayFabEvent());

            // user can specify whether it's 
            // - lightweight (goes to 1DS), 
            // - heavyweight (goes to PlayFab's WriteEvents), 
            // - or anything else
            event->eventType = eventType;
            std::stringstream name;
            name << "event_" << i;
            event->SetName(name.str());
            event->SetProperty("prop_A", 123);
            event->SetProperty("prop_B", "hello, world!");
            event->SetProperty("prop_C", true);

            (*eventApi)->EmitEvent(std::move(event), EmitEventCallback);
        }
    }

    /// EVENTS API
    /// PlayFab heavyweight events (emitted individually
    ///   and processed in a background thread using event pipeline (router, batching, etc))
    void PlayFabEventTest::HeavyweightEvents(TestContext& testContext)
    {
        eventTestContext = std::make_shared<TestContext*>(&testContext);

        // test custom event API (it uses event pipeline (router, batching, etc))
        eventApi = std::make_shared<PlayFabEventAPI*>(new PlayFabEventAPI()); // create Event API instance

        // adjust some pipeline settings
        auto pipeline = std::dynamic_pointer_cast<PlayFab::PlayFabEventPipeline>((*eventApi)->GetEventRouter()->GetPipelines().at(PlayFab::EventPipelineKey::PlayFab)); // get PF pipeline
        auto settings = pipeline->GetSettings(); // get pipeline's settings
        settings->maximalBatchWaitTime = 4; // incomplete batch expiration in seconds
        settings->maximalNumberOfItemsInBatch = 4; // number of events in a batch
        settings->maximalNumberOfBatchesInFlight = 3; // maximal number of batches processed simultaneously by a transport plugin before taking next events from the buffer

        EmitEvents(PlayFab::PlayFabEventType::Heavyweight);
    }

    /// EVENTS API
    /// OneDS lightweight events (emitted individually
    ///   and processed in a background thread using event pipeline (router, batching, etc))
    void PlayFabEventTest::LightweightEvents(TestContext& testContext)
    {
        eventTestContext = std::make_shared<TestContext*>(&testContext);

        // test custom event API (it uses event pipeline (router, batching, etc))
        eventApi = std::make_shared<PlayFabEventAPI*>(new PlayFabEventAPI()); // create Event API instance

        // adjust some pipeline settings
        auto pipeline = std::dynamic_pointer_cast<PlayFab::PlayFabEventPipeline>((*eventApi)->GetEventRouter()->GetPipelines().at(PlayFab::EventPipelineKey::OneDS)); // get OneDS pipeline
        auto settings = pipeline->GetSettings(); // get pipeline's settings
        settings->maximalBatchWaitTime = 2; // incomplete batch expiration in seconds
        settings->maximalNumberOfItemsInBatch = 3; // number of events in a batch
        settings->maximalNumberOfBatchesInFlight = 10; // maximal number of batches processed simultaneously by a transport plugin before taking next events from the buffer

        EmitEvents(PlayFab::PlayFabEventType::Lightweight);
    }

    /// EVENTS API
    /// OneDS Events API (lightweight events sent as a whole batch)
    void PlayFabEventTest::OneDSEventsApi(TestContext& testContext)
    {
        TelemetryIngestionConfigRequest configRequest;

        PlayFab::OneDSEventsAPI::GetTelemetryIngestionConfig(configRequest,
            Callback(&PlayFabEventTest::OnGetTelemetryIngestionConfig),
            Callback(&PlayFabEventTest::OnGetTelemetryIngestionConfigFail),
            &testContext);
    }
    void PlayFabEventTest::OnGetTelemetryIngestionConfig(const TelemetryIngestionConfigResponse& result, void* customData)
    {
        // create OneDS Events API instance
        PlayFab::OneDSEventsAPI api;
        api.SetCredentials("o:" + result.TenantId,
            result.IngestionKey,
            result.TelemetryJwtToken,
            result.TelemetryJwtHeaderKey,
            result.TelemetryJwtHeaderPrefix);

        // Prepare a batch of events
        PlayFab::EventsModels::WriteEventsRequest req;
        for (int j = 0; j < 5; j++)
        {
            for (int i = 0; i < 2; i++)
            {
                req.Events.push_back(CreateEventContents("event_AA_", i));
                req.Events.push_back(CreateEventContents("event_BB_", i));
            }
        }

        // Send the batch
        api.WriteTelemetryEvents(req,
            Callback(&PlayFabEventTest::OnOneDSWriteTelemetryEvents),
            Callback(&PlayFabEventTest::OnOneDSWriteTelemetryEventsFail),
            customData);
    }
    void PlayFabEventTest::OnGetTelemetryIngestionConfigFail(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("GetTelemetryIngestionConfig Failed : " + error.GenerateErrorReport());
    }
    void PlayFabEventTest::OnOneDSWriteTelemetryEvents(const WriteEventsResponse&, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }
    void PlayFabEventTest::OnOneDSWriteTelemetryEventsFail(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("OneDS WriteTelemetryEvents Failed : " + error.GenerateErrorReport());
    }

    void PlayFabEventTest::AddTests()
    {
#if (!UNITY_IOS && !UNITY_ANDROID) && (!defined(PLAYFAB_PLATFORM_IOS) && !defined(PLAYFAB_PLATFORM_ANDROID))
        AddTest("QosResultApi", &PlayFabEventTest::QosResultApi);
#endif
        AddTest("EventsApi", &PlayFabEventTest::EventsApi);
        AddTest("HeavyweightEvents", &PlayFabEventTest::HeavyweightEvents);
        AddTest("LightweightEvents", &PlayFabEventTest::LightweightEvents);
        AddTest("OneDSEventsApi", &PlayFabEventTest::OneDSEventsApi);
    }

    void PlayFabEventTest::ClassSetUp()
    {
        // Make sure PlayFab state is clean.
        PlayFabSettings::ForgetAllCredentials();

        // Log in to use event functions.
        LoginWithCustomIDRequest request;
        request.CustomId = PlayFabSettings::buildIdentifier;
        request.CreateAccount = true;

        loggedIn = false;
        bool loginComplete = false;
        PlayFabClientAPI::LoginWithCustomID(request,
            [&loginComplete](const LoginResult& /*result*/, void* customData)
            {
                *reinterpret_cast<bool*>(customData) = true;
                loginComplete = true;
            },
            [&loginComplete](const PlayFabError /*error*/, void* customData)
            {
                *reinterpret_cast<bool*>(customData) = false;
                loginComplete = true;
            },
            &loggedIn);
        
        // Sleep while waiting for log in to complete.
        while (!loginComplete)
        {
            std::this_thread::sleep_for(TimeValueMs(100));
        }
    }

    void PlayFabEventTest::SetUp(TestContext& testContext)
    {
        if (!loggedIn)
            testContext.Skip("Not logged in to PlayFab"); // Cannot run event tests if not logged in

        // Reset event test values.
        eventBatchMax = 0;
        eventPassCount = 0;
        eventFailCount = 0;
        eventFailLog = "";
    }

    void PlayFabEventTest::Tick(TestContext& /*testContext*/)
    {
        // No work needed, async tests will end themselves
    }

    void PlayFabEventTest::TearDown(TestContext& /*testContext*/)
    {
        eventTestContext = nullptr;
        eventApi = nullptr;
    }

    void PlayFabEventTest::ClassTearDown()
    {
        // Clean up any PlayFab state for next TestCase.
        PlayFabSettings::ForgetAllCredentials();
    }
}