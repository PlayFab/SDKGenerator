#include <stdafx.h>

#include <cstdint>

#include <playfab/QoS/QoS.h>
#include <playfab/QoS/PingResult.h>
#include <playfab/QoS/PlayFabQoSApi.h>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabMultiplayerApi.h>
#include <playfab/PlayFabMultiplayerDataModels.h>
#include <playfab/PlayFabEventsApi.h>
#include <playfab/PlayFabEventsDataModels.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/PlayFabPluginManager.h>

using namespace std;
using namespace PlayFab::MultiplayerModels;
using namespace PlayFab::EventsModels;

namespace PlayFab
{
    namespace QoS
    {
        bool ValidateResult(PlayFabResultCommon& resultCommon, CallRequestContainer& container)
        {
            if (container.errorWrapper.HttpCode == 200)
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

        void OnWriteEventsResult(int httpCode, std::string result, std::unique_ptr<CallRequestContainerBase> reqContainer)
        {
            CallRequestContainer& container = static_cast<CallRequestContainer&>(*reqContainer);

            WriteEventsResponse outResult;
            if (ValidateResult(outResult, container))
            {
                const auto internalPtr = container.successCallback.get();
                if (internalPtr != nullptr)
                {
                    const auto callback = (*static_cast<ProcessApiCallback<WriteEventsResponse> *>(internalPtr));
                    callback(outResult, container.GetCustomData());
                }
            }
        }

        void WriteTelemetryEvents(
            WriteEventsRequest& request,
            ProcessApiCallback<WriteEventsResponse> callback,
            ErrorCallback errorCallback = nullptr,
            void* customData = nullptr
        )
        {
            IPlayFabHttpPlugin& http = *PlayFabPluginManager::GetPlugin<IPlayFabHttpPlugin>(PlayFabPluginContract::PlayFab_Transport);
            const auto requestJson = request.ToJson();

            Json::FastWriter writer;
            std::string jsonAsString = writer.write(requestJson);

            std::unordered_map<std::string, std::string> headers;
            headers.emplace("X-EntityToken", request.authenticationContext == nullptr ? PlayFabSettings::entityToken : request.authenticationContext->entityToken);

            auto reqContainer = std::unique_ptr<CallRequestContainer>(new CallRequestContainer(
                "/Event/WriteTelemetryEvents",
                headers,
                jsonAsString,
                OnWriteEventsResult,
                customData));

            reqContainer->successCallback = std::shared_ptr<void>((callback == nullptr) ? nullptr : new ProcessApiCallback<WriteEventsResponse>(callback));
            reqContainer->errorCallback = errorCallback;

            http.MakePostRequest(std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(reqContainer.release())));
        }

        std::future<QoSResult> PlayFabQoSApi::GetQoSResultAsync(unsigned int numThreads, unsigned int timeoutMs)
        {
            return async(launch::async, [&, numThreads, timeoutMs]() { return GetQoSResult(numThreads, timeoutMs); });
        }

        QoSResult PlayFabQoSApi::GetQoSResult(unsigned int numThreads, unsigned int timeoutMs)
        {
            QoSResult result(move(GetResult(numThreads, timeoutMs)));

            if (result.errorCode != QoSErrorCode::Success)
            {
                return result;
            }

            SendResultsToPlayFab(result);
            return result;
        }

        QoSResult PlayFabQoSApi::GetResult(unsigned int numThreads, unsigned int timeoutMs)
        {
            QoSResult result;

            if (!PlayFabClientAPI::IsClientLoggedIn())
            {
                LOG_QOS("Client is not logged in" << endl);
                result.errorCode = QoSErrorCode::NotLoggedIn;
                return result;
            }

            listQosServersCompleted = false;

            // get region map (call thunderhead)
            PingThunderheadForServerList();

            // Wait for the PlayFabMultiplayerAPI::ListQosServers api to complete
            while (!listQosServersCompleted)
            {
                this_thread::sleep_for(threadWaitTimespan);
            }

            size_t serverCount = regionMap.size(); // call thunderhead to get a list of all the data centers
            if (serverCount <= 0)
            {
                result.errorCode = QoSErrorCode::FailedToRetrieveServerList;
                return result;
            }

            // get a list of region pings that need to be done
            result.regionResults.reserve(serverCount);
            vector<AzureRegion> pings = move(GetPingList(serverCount));

            // initialize accumulated results with empty (zeroed) ping results
            unordered_map<AzureRegion, PingResult> accumulatedPingResults;
            accumulatedPingResults.reserve(regionMap.size());
            InitializeAccumulatedPingResults(accumulatedPingResults);

            // Sockets that would be used to ping
            vector<shared_ptr<QoSSocket>> sockets;
            result.errorCode = SetupSockets(sockets, numThreads, timeoutMs);

            // If no sockets were initialised, return as we cant do anything. The errorCode must already be set at this point
            // Update the numThreads as well since if we have n sockets, we can only use n threads
            if ((numThreads = sockets.size()) == 0)
            {
                LOG_QOS("No socket could be created. " << std::endl);
                return result;
            }

            // initialize the async ping results
            vector<future<PingResult>> asyncPingResults(numThreads);
            InitializeAsyncPingResults(asyncPingResults);

            // ping servers
            PingServers(pings, asyncPingResults, sockets, accumulatedPingResults, timeoutMs);

            // set results with averages for individual servers
            for (auto it = accumulatedPingResults.begin(); it != accumulatedPingResults.end(); ++it)
            {
                // Calculate the latency
                int latency = (it->second.pingCount == 0) ? INT32_MAX : it->second.latencyMs / it->second.pingCount;
                result.regionResults.push_back(move(RegionResult(it->first, latency, it->second.errorCode)));
            }

            std::sort(result.regionResults.begin(), result.regionResults.end(), [](const RegionResult& first, const RegionResult& second) -> bool {return first.latencyMs < second.latencyMs; });
            return result;
        }

        void PlayFabQoSApi::SendResultsToPlayFab(QoSResult& result)
        {
            Json::Value value;
            value["ErrorCode"] = Json::Value(result.errorCode);
            
            Json::Value each_regionCenterResult;
            for (int i = 0; i < result.regionResults.size(); ++i)
            {
                Json::Value dcResult;

                dcResult["Region"] = Json::Value(result.regionResults[i].region);
                dcResult["LatencyMs"] = Json::Value(result.regionResults[i].latencyMs);
                dcResult["ErrorCode"] = Json::Value(result.regionResults[i].errorCode);

                each_regionCenterResult[i] = dcResult;
            }

            value["RegionResults"] = each_regionCenterResult;

            PlayFab::EventsModels::WriteEventsRequest request;
            PlayFab::EventsModels::EventContents eventContents;

            eventContents.Name = "qos_result";
            eventContents.EventNamespace = "playfab.servers";
            eventContents.Payload = value;
            request.Events.push_back(eventContents);

            WriteTelemetryEvents(request, WriteEventsSuccessCallBack, WriteEventsFailureCallBack);
        }

        void PlayFabQoSApi::WriteEventsSuccessCallBack(const WriteEventsResponse& result, void*)
        {
            LOG_QOS("QoSResult successfully sent to PlayFab");
        }

        void PlayFabQoSApi::WriteEventsFailureCallBack(const PlayFabError& error, void*)
        {
            LOG_QOS("Failed to QoSResult sent to PlayFab");
        }

        void PlayFabQoSApi::PingThunderheadForServerList()
        {
            if (regionMap.size() > 0)
            {
                // If the regionMap is already initialized, return
                listQosServersCompleted = true;
                return;
            }

            ListQosServersRequest request;
            PlayFabMultiplayerAPI::ListQosServers(request, ListQosServersSuccessCallBack, ListQosServersFailureCallBack, reinterpret_cast<void*>(this));
        }
        
        void PlayFabQoSApi::ListQosServersSuccessCallBack(const ListQosServersResponse& result, void* customData)
        {
            // Custom data received is a pointer to our api object
            PlayFabQoSApi* api = reinterpret_cast<PlayFabQoSApi*>(customData);

            auto a = result.QosServers;
            for (auto it = a.begin(); it != a.end(); ++it)
            {
                api->regionMap[it->Region] = move(it->ServerUrl);
            }

            api->listQosServersCompleted = true;
        }

        void PlayFabQoSApi::ListQosServersFailureCallBack(const PlayFabError& error, void* customData)
        {
            // Custom data received is a pointer to our api object
            PlayFabQoSApi* api = reinterpret_cast<PlayFabQoSApi*>(customData);

            // Log the error and return
            LOG_QOS("Could not get the server list from thunderhead\n Error : " << error.ToJson() << endl);
            api->listQosServersCompleted = true;
        }

        vector<AzureRegion> PlayFabQoSApi::GetPingList(unsigned int serverCount)
        {
            vector<PlayFab::MultiplayerModels::AzureRegion> pingList;
            pingList.reserve(numOfPingIterations * serverCount);

            // Round Robin
            for (int i = 0; i < numOfPingIterations; ++i)
            {
                for (unordered_map<AzureRegion, string>::iterator it = regionMap.begin();
                    it != regionMap.end();
                    ++it)
                {
                    pingList.push_back(it->first);
                }
            }

            return pingList;
        }

        void PlayFabQoSApi::InitializeAccumulatedPingResults(unordered_map<AzureRegion, PingResult>& accumulatedPingResults)
        {
            for (auto it = regionMap.begin();
                it != regionMap.end();
                ++it)
            {
                accumulatedPingResults[it->first] = PingResult(0, 0, 0);
            }
        }

        int PlayFabQoSApi::SetupSockets(vector<shared_ptr<QoSSocket>>& sockets, unsigned int numThreads, unsigned int timeoutMs)
        {
            int lastErrorCode = 0;

            sockets.reserve(numThreads);

            // Setup sockets based on the number of threads
            for (int i = 0; i < numThreads; ++i)
            {
                shared_ptr<QoSSocket> socket = shared_ptr<QoSSocket>(new QoSSocket());

                int errorCode;
                if ((errorCode = socket->ConfigureSocket(timeoutMs)) == 0)
                {
                    sockets.push_back(socket);
                }
                else
                {
                    lastErrorCode = errorCode;
                }
            }

            return lastErrorCode;
        }

        void PlayFabQoSApi::InitializeAsyncPingResults(vector<future<PingResult>>& asyncPingResults)
        {
            for (int i = 0; i < asyncPingResults.size(); ++i)
            {
                asyncPingResults[i] = move(future<PingResult>()); // create a fake future
            }
        }

        void PlayFabQoSApi::PingServers(vector<AzureRegion>& pings, vector<future<PingResult>>& asyncPingResults, std::vector<std::shared_ptr<QoSSocket>>& sockets, unordered_map<AzureRegion, PingResult>& accumulatedPingResults, unsigned int timeoutMs)
        {
            int pingItr = 0;
            unsigned int numThreads = asyncPingResults.size();
            size_t numPings = pings.size();
            vector<AzureRegion> pingedServers(numThreads); // remember the server for which a ping is started
            while (pingItr < numPings)
            {
                // Iterate over all the threads and servers that need to be pinged
                for (int i = 0; i < numThreads && pingItr < numPings; ++i)
                {
                    if (asyncPingResults[i].valid()) // the very first ping result might be a fake future
                    {
                        future_status status = asyncPingResults[i].wait_for(threadWaitTimespan);
                        if (status == future_status::ready)
                        {
                            // Get the result
                            PingResult thisResult(asyncPingResults[i].get());

                            // Update the result for the previous socket ping
                            UpdateAccumulatedPingResult(thisResult, pingedServers[i], accumulatedPingResults, timeoutMs);
                        }
                        else if (status == future_status::timeout)
                        {
                            // this ping is not complete yet, check the next one
                            continue;
                        }
                        else
                        {
                            LOG_QOS("Unexpected future status (deferred)");
                            // TODO: decide how to bubble this error up (if needed)
                            // Normally, this should never happen as we are not using futures of futures
                        }
                    }

                    int errorCode = 0;

                    // Update the socket address and start another ping
                    // [NOTE] Order of the following checks is imp since we can loop around and j might be out of bound
                    while (pingItr < numPings && (errorCode = sockets[i]->SetAddress(regionMap[pings[pingItr]].c_str())) != 0)
                    {
                        // If an error code is seen, save it
                        if (errorCode != 0)
                        {
                            accumulatedPingResults[pings[pingItr]].errorCode = errorCode;
                        }

                        ++pingItr;
                    }

                    // If we have an address that we can ping, start an async thread for the same
                    if (pingItr < numPings)
                    {
                        pingedServers[i] = pings[pingItr];
                        asyncPingResults[i] = async(launch::async, GetQoSResultForRegion, sockets[i]);
                        ++pingItr;
                    }
                }
            }

            // Accumulate final results
            for (int i = 0; i < numThreads; ++i)
            {
                // If the result is valid and available 
                if (asyncPingResults[i].valid())
                {
                    std::chrono::milliseconds pingWaitTime = std::chrono::milliseconds(timeoutMs);
                    future_status status = asyncPingResults[i].wait_for(pingWaitTime);
                    if (status == future_status::ready)
                    {
                        // Update the result for the previous socket ping
                        PingResult thisResult(asyncPingResults[i].get());
                        UpdateAccumulatedPingResult(thisResult, pingedServers[i], accumulatedPingResults, timeoutMs);
                    }
                }
            }
        }

        // Add the new ping result to the unordered map.
        void PlayFabQoSApi::UpdateAccumulatedPingResult(PingResult& result, AzureRegion region, std::unordered_map<AzureRegion, PingResult>& accumulatedPingResults, unsigned int timeoutMs)
        {
            if (result.errorCode != 0)
            {
                accumulatedPingResults[region].errorCode = result.errorCode;
                return;
            }

            if (result.latencyMs <= timeoutMs)
            {
                accumulatedPingResults[region].latencyMs += result.latencyMs;
                ++accumulatedPingResults[region].pingCount;
            }

            // if a ping took longer than TIMEOUT value it will be ignored (by design)
        }

        // Ping one data center and return the address.
        // Parameters : Configured socket to ping
        // Return : The ping result
        // Note that the function eat any exceptions thrown to it.
        PingResult PlayFabQoSApi::GetQoSResultForRegion(shared_ptr<QoSSocket> socket)
        {
            // Ping a data center and return the ping time
            try
            {
                return socket->GetQoSServerLatencyMs();
            }
            catch (...)
            {
                LOG_QOS("Some exception was caught while pinging. Ignore the ping");
                PingResult result(INT32_MAX, EXCEPTION_ERROR_CODE, 0);

                return result;
            }
        }
    }
}