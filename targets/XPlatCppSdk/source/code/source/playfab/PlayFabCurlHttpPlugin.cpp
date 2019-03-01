#include <stdafx.h>

#include <playfab/PlayFabCurlHttpPlugin.h>
#include <playfab/PlayFabSettings.h>
#include <curl/curl.h>

#include <stdexcept>

namespace PlayFab
{
    PlayFabCurlHttpPlugin::PlayFabCurlHttpPlugin()
    {
        activeRequestCount = 0;
        threadRunning = true;
        workerThread = std::thread(&PlayFabCurlHttpPlugin::WorkerThread, this);
    };

    PlayFabCurlHttpPlugin::~PlayFabCurlHttpPlugin()
    {
        threadRunning = false;
        try
        {
            workerThread.join();
        }
        catch (...)
        {
        }
    }

    void PlayFabCurlHttpPlugin::WorkerThread()
    {
        size_t queueSize;

        while (this->threadRunning)
        {
            try
            {
                std::unique_ptr<CallRequestContainerBase> requestContainer = nullptr;

                { // LOCK httpRequestMutex
                    std::unique_lock<std::mutex> lock(this->httpRequestMutex);

                    queueSize = this->pendingRequests.size();
                    if (queueSize != 0)
                    {
                        requestContainer = std::move(this->pendingRequests[0]);
                        this->pendingRequests.pop_front();
                    }
                } // UNLOCK httpRequestMutex

                if (queueSize == 0)
                {
                    std::this_thread::sleep_for(std::chrono::milliseconds(10));
                    continue;
                }

                if (requestContainer != nullptr)
                {
                    CallRequestContainer* requestContainerPtr = dynamic_cast<CallRequestContainer*>(requestContainer.get());
                    if (requestContainerPtr != nullptr)
                    {
                        requestContainer.release();
                        ExecuteRequest(std::unique_ptr<CallRequestContainer>(requestContainerPtr));
                    }
                }
            }
            catch (const std::exception& ex)
            {
                PlayFabPluginManager::GetInstance().HandleException(ex);
            }
            catch (...)
            {

            }
        }
    }

    void PlayFabCurlHttpPlugin::HandleCallback(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        CallRequestContainer& reqContainer = *requestContainer;
        reqContainer.finished = true;
        if (PlayFabSettings::threadedCallbacks)
        {
            HandleResults(std::move(requestContainer));
        }

        if (!PlayFabSettings::threadedCallbacks)
        {
            { // LOCK httpRequestMutex
                std::unique_lock<std::mutex> lock(httpRequestMutex);
                pendingResults.push_back(std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(requestContainer.release())));
            } // UNLOCK httpRequestMutex
        }
    }

    size_t PlayFabCurlHttpPlugin::CurlReceiveData(char* buffer, size_t blockSize, size_t blockCount, void* userData)
    {
        CallRequestContainer* reqContainer = reinterpret_cast<CallRequestContainer*>(userData);
        reqContainer->responseString.append(buffer, blockSize * blockCount);

        return (blockSize * blockCount);
    }

    void PlayFabCurlHttpPlugin::MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer)
    {
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            pendingRequests.push_back(std::move(requestContainer));
            activeRequestCount++;
        } // UNLOCK httpRequestMutex
    }

    void PlayFabCurlHttpPlugin::ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        CallRequestContainer& reqContainer = *requestContainer;

        // Set up curl handle
        CURL* curlHandle = curl_easy_init();
        curl_easy_reset(curlHandle);
        curl_easy_setopt(curlHandle, CURLOPT_NOSIGNAL, true);
        std::string urlString = reqContainer.GetFullUrl();
        curl_easy_setopt(curlHandle, CURLOPT_URL, urlString.c_str());

        // Set up headers
        curl_slist* curlHttpHeaders = nullptr;
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Accept: application/json");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Content-Type: application/json; charset=utf-8");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, ("X-PlayFabSDK: " + PlayFabSettings::versionString).c_str());
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "X-ReportErrorAsSuccess: true");

        auto headers = reqContainer.GetHeaders();

        if (headers.size() > 0)
        {
            for (auto const &obj : headers)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    std::string header = obj.first + ": " + obj.second;
                    curlHttpHeaders = curl_slist_append(curlHttpHeaders, header.c_str());
                }
            }
        }

        curl_easy_setopt(curlHandle, CURLOPT_HTTPHEADER, curlHttpHeaders);

        // Set up post & payload
        std::string payload = reqContainer.GetRequestBody();
        curl_easy_setopt(curlHandle, CURLOPT_POST, nullptr);
        curl_easy_setopt(curlHandle, CURLOPT_POSTFIELDS, payload.c_str());

        // Process result
        // TODO: CURLOPT_ERRORBUFFER ?
        curl_easy_setopt(curlHandle, CURLOPT_TIMEOUT_MS, 10000L);
        curl_easy_setopt(curlHandle, CURLOPT_WRITEDATA, &reqContainer);
        curl_easy_setopt(curlHandle, CURLOPT_WRITEFUNCTION, CurlReceiveData);

        // Send
        curl_easy_setopt(curlHandle, CURLOPT_SSL_VERIFYPEER, false); // TODO: Replace this with a ca-bundle ref???
        const auto res = curl_easy_perform(curlHandle);
        long curlHttpResponseCode = 0;
        curl_easy_getinfo(curlHandle, CURLINFO_RESPONSE_CODE, &curlHttpResponseCode);

        if (res != CURLE_OK)
        {
            reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 408;
            reqContainer.errorWrapper.HttpStatus = "Failed to contact server";
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorConnectionTimeout;
            reqContainer.errorWrapper.ErrorName = "Failed to contact server";
            reqContainer.errorWrapper.ErrorMessage = "Failed to contact server, curl error: " + std::to_string(res);
            HandleCallback(std::move(requestContainer));
        }
        else
        {
            Json::CharReaderBuilder jsonReaderFactory;
            std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
            JSONCPP_STRING jsonParseErrors;
            const bool parsedSuccessfully = jsonReader->parse(reqContainer.responseString.c_str(), reqContainer.responseString.c_str() + reqContainer.responseString.length(), &reqContainer.responseJson, &jsonParseErrors);

            if (parsedSuccessfully)
            {
                reqContainer.errorWrapper.HttpCode = reqContainer.responseJson.get("code", Json::Value::null).asInt();
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseJson.get("status", Json::Value::null).asString();
                reqContainer.errorWrapper.Data = reqContainer.responseJson.get("data", Json::Value::null);
                reqContainer.errorWrapper.ErrorName = reqContainer.responseJson.get("error", Json::Value::null).asString();
                reqContainer.errorWrapper.ErrorCode = static_cast<PlayFabErrorCode>(reqContainer.responseJson.get("errorCode", Json::Value::null).asInt());
                reqContainer.errorWrapper.ErrorMessage = reqContainer.responseJson.get("errorMessage", Json::Value::null).asString();
                reqContainer.errorWrapper.ErrorDetails = reqContainer.responseJson.get("errorDetails", Json::Value::null);
            }
            else
            {
                reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 408;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorConnectionTimeout;
                reqContainer.errorWrapper.ErrorName = "Failed to parse PlayFab response";
                reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
            }

            HandleCallback(std::move(requestContainer));
        }

        curl_slist_free_all(curlHttpHeaders);
        curlHttpHeaders = nullptr;
        curl_easy_cleanup(curlHandle);
    }

    void PlayFabCurlHttpPlugin::HandleResults(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        CallRequestContainer& reqContainer = *requestContainer;
        auto callback = reqContainer.GetCallback();
        if (callback != nullptr)
        {
            callback(
                reqContainer.responseJson.get("code", Json::Value::null).asInt(),
                reqContainer.responseString,
                std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(requestContainer.release())));
        }
    }

    size_t PlayFabCurlHttpPlugin::Update()
    {
        if (PlayFabSettings::threadedCallbacks)
        {
            throw std::runtime_error("You should not call Update() when PlayFabSettings::threadedCallbacks == true");
        }

        std::unique_ptr<CallRequestContainerBase> requestContainer = nullptr;
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            if (pendingResults.empty())
            {
                return activeRequestCount;
            }

            requestContainer = std::move(this->pendingResults[0]);
            this->pendingResults.pop_front();
            activeRequestCount--;
        } // UNLOCK httpRequestMutex

        HandleResults(std::unique_ptr<CallRequestContainer>(static_cast<CallRequestContainer*>(requestContainer.release())));

        // activeRequestCount can be altered by HandleResults, so we have to re-lock and return an updated value
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            return activeRequestCount;
        }
    }
}
