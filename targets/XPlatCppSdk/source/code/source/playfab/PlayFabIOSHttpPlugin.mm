#include <stdafx.h>
#import <UIKit/UIKit.h>

#include <playfab/PlayFabIOSHttpPlugin.h>
#include <playfab/PlayFabSettings.h>
#include <stdexcept>
#include <vector>

namespace PlayFab
{
    struct PlayFabIOSHttpPlugin::RequestImpl
    {
        RequestImpl() :
            sessionTask(nil)
        {

        }

        virtual ~RequestImpl()
        {
            sessionTask = nil;
        }

        void Cancel()
        {
            if(sessionTask)
            {
                [sessionTask cancel];
            }
        }

        __strong NSURLSessionUploadTask* sessionTask;
    };

    PlayFabIOSHttpPlugin::RequestTask::RequestTask() :
        state(RequestTask::None),
        impl(nullptr),
        requestContainer(nullptr)
    {

    }

    PlayFabIOSHttpPlugin::RequestTask::~RequestTask()
    {
        if(impl)
        {
            delete impl;
            impl = nullptr;
        }
    }

    bool PlayFabIOSHttpPlugin::RequestTask::Initialize(std::unique_ptr<CallRequestContainerBase>& requestContainer)
    {
        this->requestContainer = std::move(requestContainer);
        this->impl = new PlayFabIOSHttpPlugin::RequestImpl();
        return true;
    }
    void PlayFabIOSHttpPlugin::RequestTask::Cancel()
    {
        if(this->impl)
        {
            this->impl->Cancel();
        }
    }

    PlayFabIOSHttpPlugin::PlayFabIOSHttpPlugin() :
        workerThread(nullptr),
        threadRunning(false),
        requestingTask(nullptr)
    {

    }

    PlayFabIOSHttpPlugin::~PlayFabIOSHttpPlugin()
    {
        threadRunning = false;

        httpRequestMutex.lock();
        if(this->requestingTask)
        {
            this->requestingTask->Cancel();
        }
        if(workerThread)
        {
            httpRequestMutex.unlock();
            workerThread->join();
            httpRequestMutex.lock();
        }
        httpRequestMutex.unlock();
    }

    void PlayFabIOSHttpPlugin::MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer)
    {
        std::shared_ptr<RequestTask> requestTask = nullptr;
        try
        {
            requestTask = std::make_shared<RequestTask>();
            requestTask->Initialize(requestContainer);
        }
        catch (const std::exception& ex)
        {
            PlayFabPluginManager::GetInstance().HandleException(ex);
        }
        catch (...)
        {

        }
        if(requestTask != nullptr)
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            requestTask->state = RequestTask::Pending;
            pendingRequests.push_back(std::move(requestTask));
            if(workerThread == nullptr)
            {
                threadRunning = true;
                workerThread = std::make_unique<std::thread>(&PlayFabIOSHttpPlugin::WorkerThread, this);
            }
        } // UNLOCK httpRequestMutex
    }

    size_t PlayFabIOSHttpPlugin::Update()
    {
        if (PlayFabSettings::threadedCallbacks)
        {
            throw std::runtime_error("You should not call Update() when PlayFabSettings::threadedCallbacks == true");
        }

        std::shared_ptr<RequestTask> requestTask = nullptr;
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            if (pendingResults.empty())
            {
                return pendingRequests.size();
            }

            requestTask = std::move(this->pendingResults[0]);
            this->pendingResults.pop_front();
        } // UNLOCK httpRequestMutex

        HandleResults(*requestTask);

        // activeRequestCount can be altered by HandleResults, so we have to re-lock and return an updated value
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            return pendingRequests.size() + pendingRequests.size();
        }
    }

    void PlayFabIOSHttpPlugin::WorkerThread()
    {
        { // LOCK httpRequestMutex
            std::unique_lock<std::mutex> lock(httpRequestMutex);
            this->requestingTask = nullptr;
        }
        while(threadRunning)
        {
            RequestTask::State state;
            { // LOCK httpRequestMutex
                std::unique_lock<std::mutex> lock(httpRequestMutex);
                if(this->requestingTask == nullptr)
                {
                    if (!pendingRequests.empty())
                    {
                        this->requestingTask = this->pendingRequests[0];
                        this->pendingRequests.pop_front();
                    }
                    else
                    {
                        threadRunning = false;
                        workerThread->detach();
                        workerThread = nullptr;
                        break;
                    }
                }
                state = this->requestingTask->state;
            } // UNLOCK httpRequestMutex
            switch (state)
            {
                case RequestTask::Pending:
                {
                    ExecuteRequest(*(this->requestingTask));
                    this->requestingTask->state = RequestTask::Requesting;
                    break;
                }
                case RequestTask::Requesting:
                {
                    std::this_thread::yield();
                    break;
                }
                case RequestTask::Finished:
                {
                    if (PlayFabSettings::threadedCallbacks)
                    {
                        HandleResults(*(this->requestingTask));
                    }
                    else
                    {
                        { // LOCK httpRequestMutex
                            std::unique_lock<std::mutex> lock(httpRequestMutex);
                            this->pendingResults.push_back(this->requestingTask);
                        } // UNLOCK httpRequestMutex
                    }
                    this->requestingTask = nullptr;
                    break;
                }
                default:
                    break;
            }
        }
    }

    void PlayFabIOSHttpPlugin::ExecuteRequest(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();
        auto requestUrl = GetUrl(requestTask);

        NSURL* url = [NSURL URLWithString:[NSString stringWithUTF8String:requestUrl.c_str()]];
        NSURLSessionConfiguration* config = [NSURLSessionConfiguration defaultSessionConfiguration];
        NSURLSession* session = [NSURLSession sessionWithConfiguration:config];

        NSMutableURLRequest *urlRequest = [[NSMutableURLRequest alloc] initWithURL:url];
        urlRequest.HTTPMethod = @"POST";
        SetPredefinedHeaders(requestTask, (__bridge void*)urlRequest);

        auto headers = requestContainer.GetHeaders();
        if (headers.size() > 0)
        {
            for (auto const &obj : headers)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    [urlRequest setValue:[NSString stringWithUTF8String:obj.second.c_str()] forHTTPHeaderField:[NSString stringWithUTF8String:obj.first.c_str()]];
                }
            }
        }

        // Send a request
        size_t payloadSize = 0;
        void* payload = NULL;
        NSData* data = nil;
        if (!GetBinaryPayload(requestTask, payload, payloadSize))
        {
            // set string payload if binary wasn't provided
            std::string requestBody = requestContainer.GetRequestBody();
            payloadSize = (size_t)requestBody.size();
            data = [NSData dataWithBytes:requestBody.c_str() length:payloadSize];
        }
        else
        {
            data = [NSData dataWithBytes:payload length:payloadSize];
        }

        __block RequestTask* request = &requestTask;
        __block std::mutex* lock = &httpRequestMutex;
        NSURLSessionUploadTask *uploadTask = [session uploadTaskWithRequest:urlRequest
                                                                   fromData:data completionHandler:^(NSData *data,NSURLResponse *response,NSError *error) {
                                                                       NSHTTPURLResponse* httpResponse = (NSHTTPURLResponse*)response;
                                                                       NSString* body = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

                                                                       CallRequestContainer& requestContainer = request->RequestContainer();
                                                                       requestContainer.responseString = [body UTF8String];
                                                                       ProcessResponse(*request, static_cast<const int>(httpResponse.statusCode));
                                                                       { // LOCK httpRequestMutex
                                                                           lock->lock();
                                                                           request->state = RequestTask::Finished;
                                                                           lock->unlock();
                                                                       } // UNLOCK httpRequestMutex
                                                                   }];
        requestTask.impl->sessionTask = uploadTask;
        [uploadTask resume];
    }

    std::string PlayFabIOSHttpPlugin::GetUrl(RequestTask& requestTask) const
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();
        return PlayFabSettings::GetUrl(requestContainer.GetUrl(), PlayFabSettings::requestGetParams);
    }

    void PlayFabIOSHttpPlugin::SetPredefinedHeaders(RequestTask& requestTask, void* urlRequest)
    {
        NSMutableURLRequest* req = (__bridge NSMutableURLRequest*)urlRequest;

        [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
        [req setValue:@"application/json; charset=utf-8" forHTTPHeaderField:@"Content-Type"];
        [req setValue:[NSString stringWithUTF8String:std::string(PlayFabSettings::versionString.begin(), PlayFabSettings::versionString.end()).c_str()] forHTTPHeaderField:@"X-PlayFabSDK"];
        [req setValue:@"true" forHTTPHeaderField:@"X-ReportErrorAsSuccess"];
    }

    bool PlayFabIOSHttpPlugin::GetBinaryPayload(RequestTask& requestTask, void*& payload, size_t& payloadSize) const
    {
        return false;
    }

    void PlayFabIOSHttpPlugin::ProcessResponse(RequestTask& requestTask, const int httpCode)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();
        Json::CharReaderBuilder jsonReaderFactory;
        std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
        JSONCPP_STRING jsonParseErrors;
        const bool parsedSuccessfully = jsonReader->parse(requestContainer.responseString.c_str(), requestContainer.responseString.c_str() + requestContainer.responseString.length(), &requestContainer.responseJson, &jsonParseErrors);

        if (parsedSuccessfully)
        {
            // fully successful response
            requestContainer.errorWrapper.HttpCode = requestContainer.responseJson.get("code", Json::Value::null).asInt();
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseJson.get("status", Json::Value::null).asString();
            requestContainer.errorWrapper.Data = requestContainer.responseJson.get("data", Json::Value::null);
            requestContainer.errorWrapper.ErrorName = requestContainer.responseJson.get("error", Json::Value::null).asString();
            requestContainer.errorWrapper.ErrorCode = static_cast<PlayFabErrorCode>(requestContainer.responseJson.get("errorCode", Json::Value::null).asInt());
            requestContainer.errorWrapper.ErrorMessage = requestContainer.responseJson.get("errorMessage", Json::Value::null).asString();
            requestContainer.errorWrapper.ErrorDetails = requestContainer.responseJson.get("errorDetails", Json::Value::null);
        }
        else
        {
            requestContainer.errorWrapper.HttpCode = httpCode;
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
            requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
            requestContainer.errorWrapper.ErrorName = "Failed to parse PlayFab response";
            requestContainer.errorWrapper.ErrorMessage = jsonParseErrors;
        }
    }

    void PlayFabIOSHttpPlugin::HandleResults(RequestTask& requestTask)
    {
        CallRequestContainer& requestContainer = requestTask.RequestContainer();

        auto callback = requestContainer.GetCallback();
        if (callback != nullptr)
        {
            callback(
                     requestContainer.responseJson.get("code", Json::Value::null).asInt(),
                     requestContainer.responseString,
                     std::unique_ptr<CallRequestContainerBase>(static_cast<CallRequestContainerBase*>(requestTask.requestContainer.release())));
        }
    }

}
