#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSEventsApi.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/PlayFabError.h>

#include "../external/aria/lib/include/public/Enums.hpp"
#include "../external/aria/lib/include/public/Version.hpp"
#include "../external/aria/lib/include/aria/Config.hpp"

#include "../external/aria/lib/bond/generated/AriaProtocol_types.hpp"
#include "../external/aria/lib/bond/generated/AriaProtocol_writers.hpp"
#include "../external/aria/lib/bond/generated/AriaProtocol_readers.hpp"

#include "../external/aria/bondlite/include/bond_lite/CompactBinaryProtocolWriter.hpp"
#include "../external/aria/bondlite/include/bond_lite/Common.hpp"

#pragma warning (disable: 4100) // formal parameters are part of a public interface

// This file contains implementation of the main interface for OneDS (One Data Collector) events API.
// It requires OneDS protocol handling and Common Schema 3.0 serialization.
// A lot of the code included and referenced in this file is based on or was surgically taken from Aria OneDS SDK
// to provide minimum required functionality to support OneDS events without bringing the whole Aria SDK as a dependency.
// The references to original sources are provided in the comments to each method below.

namespace PlayFab
{
    using namespace EventsModels;
    using namespace Microsoft::Applications::Events;

    uint64_t oneDSEventSequenceId = 0;

    // Validates a OneDS event name. This is taken from Aria SDK (see its Utils.cpp).
    EventRejectedReason ValidateOneDSEventName(std::string const& name)
    {
        // Data collector uses this regex (avoided here for code size reasons):
        // ^[a-zA-Z0-9]([a-zA-Z0-9]|_){2,98}[a-zA-Z0-9]$

        if (name.length() < 1 + 2 + 1 || name.length() > 1 + 98 + 1) {
            //LOG_ERROR("Invalid event name - \"%s\": must be between 4 and 100 characters long", name.c_str());
            return REJECTED_REASON_VALIDATION_FAILED;
        }

        auto filter = [](char ch) -> bool { return !isalnum(static_cast<uint8_t>(ch)) && (ch != '_') && (ch != '.'); };
        if (std::find_if(name.begin(), name.end(), filter) != name.end()) {
            //LOG_ERROR("Invalid event name - \"%s\": must contain [0-9A-Za-z_] characters only", name.c_str());
            return REJECTED_REASON_VALIDATION_FAILED;
        }

        return REJECTED_REASON_OK;
    }

    // Validates a OneDS event's property name. This is taken from Aria SDK (see its Utils.cpp).
    EventRejectedReason ValidateOneDSPropertyName(std::string const& name)
    {
        // Data collector does not seem to validate property names at all.
        // The ObjC SDK uses this regex (avoided here for code size reasons):
        // ^[a-zA-Z0-9](([a-zA-Z0-9|_|.]){0,98}[a-zA-Z0-9])?$

        if (name.length() < 1 + 0 || name.length() > 1 + 98 + 1) {
            //LOG_ERROR("Invalid property name - \"%s\": must be between 1 and 100 characters long", name.c_str());
            return REJECTED_REASON_VALIDATION_FAILED;
        }

        auto filter = [](char ch) -> bool { return !isalnum(static_cast<uint8_t>(ch)) && (ch != '_') && (ch != '.'); };

        if (std::find_if(name.begin(), name.end(), filter) != name.end()) {
            //LOG_ERROR("Invalid property name - \"%s\": must contain [0-9A-Za-z_.] characters only", name.c_str());
            return REJECTED_REASON_VALIDATION_FAILED;
        }

        if ((name.front() == '.' || name.back() == '.') /* || (name.front() == '_' || name.back() == '_') */)
        {
            //LOG_ERROR("Invalid property name - \"%s\": must not start or end with _ or . characters", name.c_str());
            return REJECTED_REASON_VALIDATION_FAILED;
        }
        return REJECTED_REASON_OK;
    }

    // Decorator of a OneDS record. The content of this decorator is heavily based on the code in Aria's SDK (see its Logger and decorators implementation).
    bool DecorateOneDSRecord(AriaProtocol::Record& record, EventContents const& eventContents, const std::string& oneDSProjectIdIkey, const std::string& oneDSHeaderJwtTicketKey)
    {
        // --- Default parameters used in the Aria sample app:
        EventLatency eventLatency = EventLatency::EventLatency_Normal;
        EventPersistence eventPersistence = EventPersistence::EventPersistence_Normal;
        double eventPopSample = 100;
        std::string initId = "B8F9A36D-3677-42FF-BE0E-73D3A97A2E74";
        std::string installId = "C34A2D50 - CB8A - 4330 - B249 - DDCAB22B2975";

        // --- Apply common decoration
        record.name = eventContents.Name;
        if (record.name.empty())
        {
            record.name = "NotSpecified";
        }

        record.baseType = EVENTRECORD_TYPE_CUSTOM_EVENT;
        record.iKey = oneDSProjectIdIkey;

        // --- Apply base decoration
        if (record.extSdk.size() == 0)
        {
            AriaProtocol::Sdk sdk;
            record.extSdk.push_back(sdk);
        }

        record.time = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        record.ver = "3.0";
        if (record.baseType.empty())
        {
            record.baseType = record.name;
        }

        record.extSdk[0].seq = ++oneDSEventSequenceId;
        record.extSdk[0].epoch = initId;
        std::string sdkVersion = std::string("EVT-PlayFab-XPlat-C++-No-") + BUILD_VERSION_STR;
        record.extSdk[0].libVer = sdkVersion;
        record.extSdk[0].installId = installId; //m_owner.GetLogSessionData()->getSessionSDKUid();

        // set Tickets
        record.extProtocol.push_back(::AriaProtocol::Protocol());
        std::vector<std::string> ticketKeys;
        ticketKeys.push_back(oneDSHeaderJwtTicketKey);
        record.extProtocol[0].ticketKeys.push_back(ticketKeys);

        // --- Apply semantic context decoration
        if (record.data.size() == 0)
        {
            AriaProtocol::Data data;
            record.data.push_back(data);
        }
        if (record.extApp.size() == 0)
        {
            AriaProtocol::App app;
            record.extApp.push_back(app);
        }

        if (record.extDevice.size() == 0)
        {
            AriaProtocol::Device device;
            record.extDevice.push_back(device);
        }

        if (record.extOs.size() == 0)
        {
            AriaProtocol::Os os;
            record.extOs.push_back(os);
        }

        if (record.extUser.size() == 0)
        {
            AriaProtocol::User user;
            record.extUser.push_back(user);
        }

        if (record.extLoc.size() == 0)
        {
            AriaProtocol::Loc loc;
            record.extLoc.push_back(loc);
        }

        if (record.extNet.size() == 0)
        {
            AriaProtocol::Net net;
            record.extNet.push_back(net);
        }

        if (record.extProtocol.size() == 0)
        {
            AriaProtocol::Protocol proto;
            record.extProtocol.push_back(proto);
        }

        // --- Apply properties decoration
        if (eventLatency == EventLatency_Unspecified)
            eventLatency = EventLatency_Normal;

        if (eventContents.Name.empty()) {
            // OK, using some default set by earlier decorator.
        }
        else
        {
            EventRejectedReason isValidEventName = ValidateOneDSEventName(eventContents.Name);
            if (isValidEventName != REJECTED_REASON_OK) {
                //LOG_ERROR("Invalid event properties!");
                return false;
            }
        }

        record.popSample = eventPopSample;

        int64_t flags = 0;
        if (EventPersistence_Critical == eventPersistence)
        {
            flags = flags | 0x02;
        }
        else
        {
            flags = flags | 0x01;
        }

        if (eventLatency >= EventLatency_RealTime)
        {
            flags = flags | 0x0200;
        }
        else if (eventLatency == EventLatency_CostDeferred)
        {
            flags = flags | 0x0300;
        }
        else
        {
            flags = flags | 0x0100;
        }
        record.flags = flags;

        std::map<std::string, ::AriaProtocol::Value>& ext = record.data[0].properties;
        std::map<std::string, ::AriaProtocol::Value> extPartB;

        for (auto &propName : eventContents.Payload.getMemberNames())
        {
            EventRejectedReason isValidPropertyName = ValidateOneDSPropertyName(propName);
            if (isValidPropertyName != REJECTED_REASON_OK)
            {
                return false;
            }

            const auto &v = eventContents.Payload[propName];

            std::vector<uint8_t> guid;

            switch (v.type())
            {
                case Json::ValueType::stringValue:
                {
                    AriaProtocol::Value temp;
                    temp.stringValue = v.asString();
                    ext[propName] = temp;
                    break;
                }
                case Json::ValueType::intValue:
                {
                    AriaProtocol::Value temp;
                    temp.type = ::AriaProtocol::ValueKind::ValueInt64;
                    temp.longValue = v.asInt64();
                    ext[propName] = temp;
                    break;
                }
                case Json::ValueType::uintValue:
                {
                    AriaProtocol::Value temp;
                    temp.type = ::AriaProtocol::ValueKind::ValueUInt64;
                    temp.longValue = v.asUInt64();
                    ext[propName] = temp;
                    break;
                }
                case Json::ValueType::realValue:
                {
                    AriaProtocol::Value temp;
                    temp.type = ::AriaProtocol::ValueKind::ValueDouble;
                    temp.doubleValue = v.asDouble();
                    ext[propName] = temp;
                    break;
                }
                case Json::ValueType::booleanValue:
                {
                    AriaProtocol::Value temp;
                    temp.type = ::AriaProtocol::ValueKind::ValueBool;
                    temp.longValue = v.asBool();
                    ext[propName] = temp;
                    break;
                }
                case Json::ValueType::arrayValue:
                {
                    AriaProtocol::Value temp;
                    temp.type = ::AriaProtocol::ValueKind::ValueArrayString;
                    temp.stringValue = v.asString();
                    ext[propName] = temp;
                    break;
                }
                default:
                {
                    // Convert all unknown types to string
                    AriaProtocol::Value temp;
                    temp.stringValue = v.asString();
                    ext[propName] = temp;
                }
            }
        }

        if (extPartB.size() > 0)
        {
            AriaProtocol::Data partBdata;
            partBdata.properties = extPartB;
            record.baseData.push_back(partBdata);
        }

        return true;
    }

    size_t OneDSEventsAPI::Update()
    {
        IPlayFabHttpPlugin& http = *PlayFabPluginManager::GetPlugin<IPlayFabHttpPlugin>(PlayFabPluginContract::PlayFab_Transport, PLUGIN_TRANSPORT_ONEDS);
        return http.Update();
    }

    void OneDSEventsAPI::SetCredentials(const std::string& projectIdIkey, const std::string& ingestionKey, const std::string& jwtToken, const std::string& headerJwtTicketKey, const std::string& headerJwtTicketPrefix)
    {
        oneDSProjectIdIkey = projectIdIkey;
        oneDSIngestionKey = ingestionKey;
        oneDSJwtToken = jwtToken;
        oneDSHeaderJwtTicketKey = headerJwtTicketKey;
        oneDSHeaderJwtTicketPrefix = headerJwtTicketPrefix;
        isOneDSAuthenticated = true;
    }

    void OneDSEventsAPI::ForgetAllCredentials()
    {
        isOneDSAuthenticated = false;
        oneDSProjectIdIkey = "";
        oneDSIngestionKey = "";
        oneDSJwtToken = "";
        oneDSHeaderJwtTicketKey = "";
        oneDSHeaderJwtTicketPrefix = "";
    }

    bool OneDSEventsAPI::GetIsOneDSAuthenticated() const
    {
        return isOneDSAuthenticated;
    }

    void OneDSEventsAPI::GetTelemetryIngestionConfig(
        TelemetryIngestionConfigRequest& request,
        ProcessApiCallback<TelemetryIngestionConfigResponse> callback,
        ErrorCallback errorCallback,
        void* customData
    )
    {
        IPlayFabHttpPlugin& http = *PlayFabPluginManager::GetPlugin<IPlayFabHttpPlugin>(PlayFabPluginContract::PlayFab_Transport);
        const auto requestJson = request.ToJson();

        Json::FastWriter writer;
        std::string jsonAsString = writer.write(requestJson);

        std::unordered_map<std::string, std::string> headers;
        headers.emplace("X-EntityToken", request.authenticationContext == nullptr ? PlayFabSettings::entityToken : request.authenticationContext->entityToken);

        auto reqContainer = std::unique_ptr<CallRequestContainer>(new CallRequestContainer(
            "/Event/GetTelemetryIngestionConfig",
            headers,
            jsonAsString,
            OnGetTelemetryIngestionConfigResult,
            customData));

        reqContainer->successCallback = std::shared_ptr<void>((callback == nullptr) ? nullptr : new ProcessApiCallback<TelemetryIngestionConfigResponse>(callback));
        reqContainer->errorCallback = errorCallback;

        http.MakePostRequest(std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(reqContainer.release())));
    }

    void OneDSEventsAPI::OnGetTelemetryIngestionConfigResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer)
    {
        CallRequestContainer& container = static_cast<CallRequestContainer&>(*reqContainer);

        TelemetryIngestionConfigResponse outResult;
        if (ValidateResult(outResult, container))
        {

            const auto internalPtr = container.successCallback.get();
            if (internalPtr != nullptr)
            {
                const auto callback = (*static_cast<ProcessApiCallback<TelemetryIngestionConfigResponse> *>(internalPtr));
                callback(outResult, container.GetCustomData());
            }
        }
    }

    void OneDSEventsAPI::WriteTelemetryEvents(
        WriteEventsRequest& request,
        ProcessApiCallback<EventsModels::OneDSWriteEventsResponse> callback,
        ErrorCallback errorCallback,
        void* customData
    )
    {
        if (!isOneDSAuthenticated)
        {
            PlayFabError result;
            result.ErrorCode = PlayFabErrorCode::PlayFabErrorAuthTokenDoesNotExist;
            result.ErrorName = "OneDSError";
            result.ErrorMessage = "OneDS API client is not authenticated. Please make sure OneDS credentials are set.";
            if (PlayFabSettings::globalErrorHandler != nullptr)
                PlayFabSettings::globalErrorHandler(result, customData);
            if (errorCallback != nullptr)
                errorCallback(result, customData);
            return;
        }

        // get transport plugin for OneDS
        IPlayFabHttpPlugin& http = *PlayFabPluginManager::GetPlugin<IPlayFabHttpPlugin>(PlayFabPluginContract::PlayFab_Transport, PLUGIN_TRANSPORT_ONEDS);
        std::vector<uint8_t> serializedBatch;
        bond_lite::CompactBinaryProtocolWriter batchWriter(serializedBatch);
        for (const auto& event : request.Events)
        {
            AriaProtocol::Record record;
            if (DecorateOneDSRecord(record, event, oneDSProjectIdIkey, oneDSHeaderJwtTicketKey))
            {
                // OneDS record was composed successfully,
                // serialize it
                std::vector<uint8_t> serializedRecord;
                bond_lite::CompactBinaryProtocolWriter recordWriter(serializedRecord);
                bond_lite::Serialize(recordWriter, record);

                // add to OneDS batch serialization
                batchWriter.WriteBlob(serializedRecord.data(), serializedRecord.size());
            }
        }

        // send batch
        std::unordered_map<std::string, std::string> headers;
        headers.emplace("APIKey", oneDSIngestionKey);
        headers.emplace("Tickets", "\"" + oneDSHeaderJwtTicketKey + "\": \"" + oneDSHeaderJwtTicketPrefix + ":" + oneDSJwtToken + "\"");

        auto reqContainer = std::unique_ptr<OneDSCallRequestContainer>(new OneDSCallRequestContainer(
            headers,
            serializedBatch,
            OnWriteTelemetryEventsResult,
            customData));

        reqContainer->successCallback = std::shared_ptr<void>((callback == nullptr) ? nullptr : new ProcessApiCallback<OneDSWriteEventsResponse>(callback));
        reqContainer->errorCallback = errorCallback;

        http.MakePostRequest(std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(reqContainer.release())));
    }

    void OneDSEventsAPI::OnWriteTelemetryEventsResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer)
    {
        CallRequestContainer& container = static_cast<CallRequestContainer&>(*reqContainer);

        OneDSWriteEventsResponse outResult;
        if (ValidateResult(outResult, container))
        {
            outResult.errorWrapper = &container.errorWrapper;
            const auto internalPtr = container.successCallback.get();
            if (internalPtr != nullptr)
            {
                const auto callback = (*static_cast<ProcessApiCallback<OneDSWriteEventsResponse> *>(internalPtr));
                callback(outResult, container.GetCustomData());
            }
        }
    }

    bool OneDSEventsAPI::ValidateResult(PlayFabResultCommon& resultCommon, CallRequestContainer& container)
    {
        if (container.errorWrapper.ErrorCode == PlayFabErrorCode::PlayFabErrorSuccess)
        {
            resultCommon.FromJson(container.errorWrapper.Data);
            resultCommon.Request = container.errorWrapper.Request;
            return true;
        }
        else // Process the error case
        {
            if (PlayFabSettings::globalErrorHandler != nullptr)
                PlayFabSettings::globalErrorHandler(container.errorWrapper, container.GetCustomData());
            if (container.errorCallback != nullptr)
                container.errorCallback(container.errorWrapper, container.GetCustomData());
            return false;
        }
    }
}

#endif
