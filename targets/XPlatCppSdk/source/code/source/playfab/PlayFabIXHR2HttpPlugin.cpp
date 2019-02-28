#include <stdafx.h>

#include <playfab/PlayFabIXHR2HttpPlugin.h>
#include <playfab/PlayFabSettings.h>

#include <stdexcept>

namespace PlayFab
{
    PlayFabIXHR2HttpPlugin::PlayFabIXHR2HttpPlugin()
    {
        activeRequestCount = 0;
        threadRunning = true;
        workerThread = std::thread(&PlayFabIXHR2HttpPlugin::WorkerThread, this);
    };

    PlayFabIXHR2HttpPlugin::~PlayFabIXHR2HttpPlugin()
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

    void PlayFabIXHR2HttpPlugin::WorkerThread()
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

    void PlayFabIXHR2HttpPlugin::HandleCallback(std::unique_ptr<CallRequestContainer> requestContainer)
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

    void PlayFabIXHR2HttpPlugin::MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer)
    {
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            pendingRequests.push_back(std::move(requestContainer));
            activeRequestCount++;
        } // UNLOCK httpRequestMutex
    }

    void PlayFabIXHR2HttpPlugin::SetupRequestHeaders(const CallRequestContainer& reqContainer, std::vector< HttpHeaderInfo>& headers)
    {
        // Header 1
        HttpHeaderInfo contentHeader;
        contentHeader.wstrHeaderName = L"Content-Type";
        contentHeader.wstrHeaderValue = L"application/json;charset=utf-8";
        headers.push_back(std::move(contentHeader));

        // Header 2
        HttpHeaderInfo acceptHeader;
        acceptHeader.wstrHeaderName = L"Accept";
        acceptHeader.wstrHeaderValue = L"application/json";
        headers.push_back(std::move(acceptHeader));

        // Header 3
        HttpHeaderInfo playFabSdkHeader;
        playFabSdkHeader.wstrHeaderName = L"X-PlayFabSDK";
        playFabSdkHeader.wstrHeaderValue = std::wstring(PlayFabSettings::versionString.begin(), PlayFabSettings::versionString.end());
        headers.push_back(std::move(playFabSdkHeader));

        // Header 4
        HttpHeaderInfo reportErrorAsSuccessHeader;
        reportErrorAsSuccessHeader.wstrHeaderName = L"X-ReportErrorAsSuccess";
        reportErrorAsSuccessHeader.wstrHeaderValue = L"true";
        headers.push_back(std::move(reportErrorAsSuccessHeader));

        auto reqHeaders = reqContainer.GetHeaders();

        if (reqHeaders.size() > 0)
        {
            for (auto const &obj : reqHeaders)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    HttpHeaderInfo hInfo;
                    hInfo.wstrHeaderName = std::wstring(obj.first.begin(), obj.first.end());
                    hInfo.wstrHeaderValue = std::wstring(obj.second.begin(), obj.second.end());
                    headers.push_back(std::move(hInfo));
                }
            }
        }
    }

    void PlayFabIXHR2HttpPlugin::ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        CallRequestContainer& reqContainer = *requestContainer;

        // Create request
        HttpRequest postEventRequest;
        
        // Setup headers
        std::vector<HttpHeaderInfo> headers;
        SetupRequestHeaders(reqContainer, headers);

        // Setup url
        std::string urlString = reqContainer.GetFullUrl();
        std::wstring url(urlString.begin(), urlString.end());
        
        // Setup payload
        std::string payload = reqContainer.GetRequestBody();

        // Send post request
        postEventRequest.Open(
            L"POST",
            url,
            headers,
            payload);

        // Wait for the request to complete
        postEventRequest.WaitForFinish();

        const HRESULT res = postEventRequest.GetResult();
        const DWORD status = postEventRequest.GetStatus();
        auto response = postEventRequest.GetData();
        reqContainer.responseString = std::string(response.begin(), response.end());

        // 401 is a special case where the status does not bubble up and we have to parse it from the HRESULT
        if (status == 401)
        {
            reqContainer.errorWrapper.HttpCode = 401;
            reqContainer.errorWrapper.HttpStatus = "Access denied";

            reqContainer.errorWrapper.ErrorCode = PlayFabErrorConnectionRefused;
            reqContainer.errorWrapper.ErrorName = "Access denied";
            reqContainer.errorWrapper.ErrorMessage = "Failed to contact server, error: " + std::to_string(res);
            HandleCallback(std::move(requestContainer));
        }
        else if (FAILED(res))
        {
            reqContainer.errorWrapper.HttpCode = status;
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
                reqContainer.errorWrapper.HttpCode = status;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorConnectionTimeout;
                reqContainer.errorWrapper.ErrorName = "Failed to parse PlayFab response";
                reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
            }

            HandleCallback(std::move(requestContainer));
        }
    }

    void PlayFabIXHR2HttpPlugin::HandleResults(std::unique_ptr<CallRequestContainer> requestContainer)
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

    size_t PlayFabIXHR2HttpPlugin::Update()
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
