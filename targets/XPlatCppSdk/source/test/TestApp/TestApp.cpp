// Copyright (C) Microsoft Corporation. All rights reserved.

#include <iostream>
#include <cstdio>
#include <memory>

#include "TestAppPch.h"
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabAuthenticationApi.h>
#include <playfab/PlayFabAuthenticationDataModels.h>
#include <playfab/PlayFabProfilesApi.h>
#include <playfab/PlayFabProfilesDataModels.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/PlayFabTelemetryEventsApi.h>
#include <playfab/PlayFabTelemetryEventsDataModels.h>
#include <playfab/PlayFabEventsApi.h>
#include <playfab/PlayFabEventsDataModels.h>
#include <playfab/PlayFabEventApi.h>
#include <playfab/OneDSEventsApi.h>
#include <playfab/OneDSHttpPlugin.h>

#include <playfab/QoS/PlayFabQoSApi.h>

#pragma warning (disable: 4100) // formal parameters are part of a public interface

using namespace std;

constexpr int numberOfEventsEmitted = 6;

static bool loginCompleted;
static bool operationCompleted;
static int eventCounter = 0;

using namespace PlayFab::QoS;
using namespace std;

void EmitEventCallback(std::shared_ptr<const PlayFab::IPlayFabEvent> event, std::shared_ptr<const PlayFab::IPlayFabEmitEventResponse> response)
{
    auto pfEvent = std::dynamic_pointer_cast<const PlayFab::PlayFabEvent>(event);
    auto pfResponse = std::dynamic_pointer_cast<const PlayFab::PlayFabEmitEventResponse>(response);

    if (pfResponse->playFabError->ErrorCode == PlayFab::PlayFabErrorCode::PlayFabErrorSuccess)
    {
        printf(("-> " + pfEvent->GetName() + " was sent successfully " +
            "in the batch #" + std::to_string(pfResponse->batchNumber) + " "
            "of " + std::to_string(pfResponse->batch->size()) + " events. "
            "HTTP code: " + std::to_string(pfResponse->playFabError->HttpCode) +
            ", app error code: " + std::to_string(pfResponse->playFabError->ErrorCode) +
            "\n").c_str());
    }
    else
    {
        printf(("-> " + pfEvent->GetName() + " received an error back " +
            "in the batch #" + std::to_string(pfResponse->batchNumber) + " "
            "of " + std::to_string(pfResponse->batch->size()) + " events. "
            "HTTP code: " + std::to_string(pfResponse->playFabError->HttpCode) +
            ", app error code: " + std::to_string(pfResponse->playFabError->ErrorCode) +
            ", HTTP status: " + pfResponse->playFabError->HttpStatus +
            ", Message: " + pfResponse->playFabError->ErrorMessage +
            " \n").c_str());
    }

    if (++eventCounter >= numberOfEventsEmitted)
    {
        operationCompleted = true;
    }
}

void OnOneDSWriteTelemetryEventsSucceeded(const PlayFab::EventsModels::WriteEventsResponse& result, void*)
{
    printf(("========== OneDS WriteTelemetryEvents Succeeded: " + result.ToJson().toStyledString() + "\n").c_str());
    operationCompleted = true;
}

void OnOneDSWriteTelemetryEventsFailed(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== OneDS WriteTelemetryEvents Failed: " + error.GenerateErrorReport() + "\n").c_str());
    operationCompleted = true;
}

void OnWriteEventsSucceeded(const PlayFab::EventsModels::WriteEventsResponse& result, void*)
{
    printf(("========== PlayFab WriteEvents Succeeded: " + result.ToJson().toStyledString() + "\n").c_str());
    operationCompleted = true;
}

void OnWriteEventsFailed(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab WriteEvents Failed: " + error.GenerateErrorReport() + "\n").c_str());
    operationCompleted = true;
}

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab call Failed: " + error.GenerateErrorReport() + "\n").c_str());
}

void OnGetProfile(const PlayFab::ProfilesModels::GetEntityProfileResponse& result, void*)
{
    printf(("========== PlayFab Profiles Success: " + result.Profile->Entity->Type + "\n").c_str());
}

void OnGetEntityToken(const PlayFab::AuthenticationModels::GetEntityTokenResponse& result, void*)
{
    printf(("========== PlayFab GetEntityToken Success: " + result.EntityToken + "\n").c_str());

    auto req = PlayFab::ProfilesModels::GetEntityProfileRequest();

    PlayFab::PlayFabProfilesAPI::GetProfile(req, OnGetProfile, OnPlayFabFail);
}

void OnProfile(const PlayFab::ClientModels::GetPlayerProfileResult& result, void*)
{
    printf(("========== PlayFab Profile Success: " + result.PlayerProfile->DisplayName + "\n").c_str());

    auto request = PlayFab::AuthenticationModels::GetEntityTokenRequest();

    PlayFab::PlayFabAuthenticationAPI::GetEntityToken(request, OnGetEntityToken);
}

void OnLoginSuccess(const PlayFab::ClientModels::LoginResult& result, void*)
{
    printf(("========== PlayFab Login Success: " + result.PlayFabId + "\n").c_str());

    printf("========== Starting PlayFab GetProfile API call.\n");
    PlayFab::ClientModels::GetPlayerProfileRequest request;
    PlayFab::PlayFabClientAPI::GetPlayerProfile(request, OnProfile, OnPlayFabFail);
    loginCompleted = true;
}

void OnLoginFailed(const PlayFab::PlayFabError& error, void* customData)
{
    OnPlayFabFail(error, customData);
    loginCompleted = true;
}

void PrintResult(const PlayFab::QoS::DataCenterResult& result)
{
    cout << "Region : " << result.region 
        << "\tDataCenter : " << result.dataCenterName
        << "\tLatency : " << result.latencyMs
        << "\tErrorCode :  " << result.lastErrorCode
        << endl;
}

void TestGetQosResultApi()
{
    char c = 'a';
    PlayFab::QoS::PlayFabQoSApi api;

    while (c != 'e' && c != 'E')
    {
        auto result = api.GetQoSResult(5, 200);

        if (result.lastErrorCode == 0)
        {
            vector<PlayFab::QoS::DataCenterResult> r(move(result.dataCenterResults));

            for (int i = 0; i<r.size(); ++i)
            {
                PrintResult(r[i]);
            }
        }
        else
        {
            cout << "Result could not be populated : " << result.lastErrorCode << endl;
        }

        cout << "[QOS API] To exit, enter 'e', else enter anything else : " << endl;
        cin >> c;
    }
}

PlayFab::EventsModels::EventContents CreateEventContents(const std::string& eventName, int i)
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

void TestPlayFabEventsApi()
{
    PlayFab::EventsModels::WriteEventsRequest req;

    // send several events
    for (int i = 0; i < 2; i++)
    {
        req.Events.push_back(CreateEventContents("event_A_", i));
        req.Events.push_back(CreateEventContents("event_B_", i));
    }

    operationCompleted = false;
    PlayFab::PlayFabEventsAPI::WriteEvents(req, &OnWriteEventsSucceeded, &OnWriteEventsFailed);
    while (!operationCompleted)
    {
        std::this_thread::yield();
    }
}

void EmitEvents(PlayFab::PlayFabEventAPI& api, PlayFab::PlayFabEventType eventType)
{
    // emit several events fast, they will be batched up in a pipeline according to pipeline's settings
    for (int i = 0; i < numberOfEventsEmitted; i++)
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
        printf((event->GetName() + " is emitted ->\n").c_str());

        api.EmitEvent(std::move(event), &EmitEventCallback);
    }
}

void TestHeavyweightEvents()
{
    printf("=== Emitting heavyweight events (to send to PlayFab)\n");

    // test custom event API (it uses event pipeline (router, batching, etc))
    PlayFab::PlayFabEventAPI api; // create Event API instance

    // adjust some pipeline settings
    auto pipeline = std::dynamic_pointer_cast<PlayFab::PlayFabEventPipeline>(api.GetEventRouter()->GetPipelines().at(PlayFab::EventPipelineKey::PlayFab)); // get PF pipeline
    auto settings = pipeline->GetSettings(); // get pipeline's settings
    settings->maximalBatchWaitTime = 4; // incomplete batch expiration in seconds
    settings->maximalNumberOfItemsInBatch = 4; // number of events in a batch
    settings->maximalNumberOfBatchesInFlight = 3; // maximal number of batches processed simultaneously by a transport plugin before taking next events from the buffer

    eventCounter = 0;
    operationCompleted = false;
    EmitEvents(api, PlayFab::PlayFabEventType::Heavyweight);
    while (!operationCompleted)
    {
        std::this_thread::yield();
    }
}

void TestOneDSEventsApi()
{
    // Get OneDS context
    operationCompleted = false;
    bool isOneDSAuthenticated = false;
    std::string oneDSProjectIdIkey;
    std::string oneDSIngestionKey;
    PlayFab::EventsModels::TelemetryIngestionConfigRequest configRequest;
    PlayFab::PlayFabTelemetryEventsAPI::GetTelemetryIngestionConfig(configRequest,
        [&](const PlayFab::EventsModels::TelemetryIngestionConfigResponse& result, void* relayedCustomData)
        {
            oneDSProjectIdIkey = "o:" + result.TenantId;
            oneDSIngestionKey = result.IngestionKey;
            isOneDSAuthenticated = true;
            operationCompleted = true;
        },
        [&](const PlayFab::PlayFabError& error, void* relayedCustomData)
        {
            printf(("========== GetTelemetryIngestionConfig Failed: " + error.GenerateErrorReport() + "\n").c_str());
            isOneDSAuthenticated = false;
            operationCompleted = true;
        });
    while (!operationCompleted)
    {
        std::this_thread::yield();
    }

    if (!isOneDSAuthenticated)
        return;

    // set OneDS HTTP plugin
    auto oneDSHttpPlugin = std::shared_ptr<PlayFab::OneDSHttpPlugin>(new PlayFab::OneDSHttpPlugin());
    PlayFab::PlayFabPluginManager::SetPlugin(oneDSHttpPlugin, PlayFab::PlayFabPluginContract::PlayFab_Transport, PlayFab::PLUGIN_TRANSPORT_ONEDS);

    // create OneDS Events API instance
    PlayFab::OneDSEventsAPI api;
    api.SetCredentials(oneDSProjectIdIkey, oneDSIngestionKey);

    // send several events
    PlayFab::EventsModels::WriteEventsRequest req;
    // - prepare a batch
    for (int j = 0; j < 5; j++)
    {
        for (int i = 0; i < 2; i++)
        {
            req.Events.push_back(CreateEventContents("event_AA_", i));
            req.Events.push_back(CreateEventContents("event_BB_", i));
        }
    }
    // - send the batch
    operationCompleted = false;
    api.WriteTelemetryEvents(req, &OnOneDSWriteTelemetryEventsSucceeded, &OnOneDSWriteTelemetryEventsFailed);
    while (!operationCompleted)
    {
        std::this_thread::yield();
    }
}

void TestLightweightEvents()
{
    printf("=== Emitting lightweight events (to send to OneDS)\n");

    // test custom event API (it uses event pipeline (router, batching, etc))
    PlayFab::PlayFabEventAPI api; // create Event API instance (it handles both PlayFab and OneDS heavyweight/lightweight events)

    // adjust some pipeline settings
    auto pipeline = std::dynamic_pointer_cast<PlayFab::PlayFabEventPipeline>(api.GetEventRouter()->GetPipelines().at(PlayFab::EventPipelineKey::OneDS)); // get OneDS pipeline
    auto settings = pipeline->GetSettings(); // get pipeline's settings
    settings->maximalBatchWaitTime = 2; // incomplete batch expiration in seconds
    settings->maximalNumberOfItemsInBatch = 3; // number of events in a batch
    settings->maximalNumberOfBatchesInFlight = 10; // maximal number of batches processed simultaneously by a transport plugin before taking next events from the buffer

    eventCounter = 0;
    operationCompleted = false;
    EmitEvents(api, PlayFab::PlayFabEventType::Lightweight);
    while (!operationCompleted)
    {
        std::this_thread::yield();
    }
}

int main()
{
    // Super hacky short-term functionality PlayFab Test - TODO: Put the regular set of tests into proper Unit Test project
    printf("========== Starting PlayFab Login API call.\n");
    PlayFab::PlayFabSettings::titleId = "6195";
    PlayFab::PlayFabSettings::threadedCallbacks = true;
    PlayFab::ClientModels::LoginWithCustomIDRequest request;
    request.CustomId = "test_GSDK";
    request.CreateAccount = true;
    PlayFab::PlayFabClientAPI::LoginWithCustomID(request, OnLoginSuccess, OnLoginFailed);

    while (!loginCompleted)
    {
        std::this_thread::yield();
    }

    TestGetQosResultApi();

    // PlayFab Events API (heavyweight events sent as a whole batch)
    TestPlayFabEventsApi(); 

    // PlayFab heavyweight events (emitted individually
    // and processed in a background thread using event pipeline (router, batching, etc))
    TestHeavyweightEvents();

    // OneDS Events API (lightweight events sent as a whole batch)
    TestOneDSEventsApi();

    // OneDS lightweight events (emitted individually
    // and processed in a background thread using event pipeline (router, batching, etc))
    TestLightweightEvents();

    return 0;
}