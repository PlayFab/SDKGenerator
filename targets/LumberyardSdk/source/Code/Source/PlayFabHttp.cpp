#include "StdAfx.h"
#include "PlayFabHttp.h"
#include "PlayFabSettings.h"

#include <aws/core/http/HttpClient.h>
#include <aws/core/http/HttpRequest.h>
#include <aws/core/http/HttpResponse.h>
#include <aws/core/client/ClientConfiguration.h>
#include <aws/core/utils/memory/stl/AWSStringStream.h>

using namespace PlayFab;
using namespace rapidjson;

///////////////////// PlayFabRequest /////////////////////
PlayFabRequest::PlayFabRequest(const Aws::String& URI, Aws::Http::HttpMethod method, const Aws::String& authKey, const Aws::String& authValue, const Aws::String& requestJsonBody, void* customData, void* mResultCallback, ErrorCallback mErrorCallback, const HttpCallback& internalCallback)
    : mURI(URI)
    , mMethod(method)
    , mAuthKey(authKey)
    , mAuthValue(authValue)
    , mRequestJsonBody(requestJsonBody)
    , mCustomData(customData)
    , mResponseText(nullptr)
    , mResponseSize(0)
    , mResponseJson(new rapidjson::Document)
    , mError(nullptr)
    , mInternalCallback(internalCallback)
    , mResultCallback(mResultCallback)
    , mErrorCallback(mErrorCallback)
{
}

PlayFabRequest::~PlayFabRequest()
{
    if (mResponseText != nullptr)
        delete mResponseText;
    if (mError != nullptr)
        delete mError;
    delete mResponseJson;
}

void PlayFabRequest::HandleErrorReport()
{
    mError = new PlayFabError;

    if (mResponseSize != 0 // Not a null response
        && mResponseJson->GetParseError() == NULL) // Proper json response
    {
        // If we have a proper json response, try to parse that json into our error-result format
        auto end = mResponseJson->MemberEnd();
        auto errorCodeJson = mResponseJson->FindMember("errorCode");
        mError->ErrorCode = (errorCodeJson != end && errorCodeJson->value.IsNumber()) ? static_cast<PlayFabErrorCode>(errorCodeJson->value.GetInt()) : PlayFabErrorServiceUnavailable;
        auto codeJson = mResponseJson->FindMember("code");
        mError->HttpCode = (codeJson != end && codeJson->value.IsNumber()) ? codeJson->value.GetInt() : 503;
        auto statusJson = mResponseJson->FindMember("status");
        mError->HttpStatus = (statusJson != end && statusJson->value.IsString()) ? statusJson->value.GetString() : "ServiceUnavailable";
        auto errorNameJson = mResponseJson->FindMember("error");
        mError->ErrorName = (errorNameJson != end && errorNameJson->value.IsString()) ? errorNameJson->value.GetString() : "ServiceUnavailable";
        auto errorMessageJson = mResponseJson->FindMember("errorMessage");
        mError->ErrorMessage = (errorMessageJson != end && errorMessageJson->value.IsString()) ? errorMessageJson->value.GetString() : mResponseText;
        auto errorDetailsJson = mResponseJson->FindMember("errorDetails");
        if (errorDetailsJson != end && errorDetailsJson->value.IsObject())
        {
            const Value& errorDetailsObj = errorDetailsJson->value;

            for (Value::ConstMemberIterator itr = errorDetailsObj.MemberBegin(); itr != errorDetailsObj.MemberEnd(); ++itr)
            {
                if (!itr->name.IsString() || !itr->value.IsArray())
                {
                    const Value& errorList = itr->value;
                    for (Value::ConstValueIterator erroListIter = errorList.Begin(); erroListIter != errorList.End(); ++erroListIter)
                        mError->ErrorDetails.insert(std::pair<Aws::String, Aws::String>(itr->name.GetString(), erroListIter->GetString()));
                }
            }
        }
    }
    else
    {
        // If we get here, we failed to connect meaningfully to the server - either a timeout, or a non-json response (which means aws failed or something)
        mError->HttpCode = mResponseSize == 0 ? 408 : 503; // 408 for no response, 503 for a non-json response
        mError->HttpStatus = mResponseSize == 0 ? "RequestTimeout" : "ServiceUnavailable";
        mError->ErrorCode = mResponseSize == 0 ? PlayFabErrorConnectionTimeout : PlayFabErrorServiceUnavailable;
        mError->ErrorName = mResponseSize == 0 ? "ConnectionTimeout" : "ServiceUnavailable";
        // For text returns, use the non-json response if possible, else default to no response
        mError->ErrorMessage = mError->HttpStatus = mResponseSize == 0 ? "Request Timeout or null response" : mResponseText;
    }

    // Send the error callbacks
    if (PlayFabSettings::globalErrorHandler != nullptr)
        PlayFabSettings::globalErrorHandler(*mError, mCustomData);
    if (mErrorCallback != nullptr)
        mErrorCallback(*mError, mCustomData);
}

///////////////////// PlayFabRequestManager /////////////////////
PlayFabRequestManager PlayFabRequestManager::playFabHttp;

PlayFabRequestManager::PlayFabRequestManager()
{
    m_runThread = true;
    auto function = std::bind(&PlayFabRequestManager::ThreadFunction, this);
    m_thread = CrySimpleManagedThread::CreateThread("PlayFabHttp", AZStd::move(function));
}

PlayFabRequestManager::~PlayFabRequestManager()
{
    m_runThread = false;
    m_requestConditionVar.notify_all();
    m_thread->Join();
}

void PlayFabRequestManager::AddRequest(PlayFabRequest* requestContainer)
{
    {
        AZStd::lock_guard<AZStd::mutex> lock(m_requestMutex);
        m_requestsToHandle.push(AZStd::move(requestContainer));
    }
    m_requestConditionVar.notify_all();
}

std::shared_ptr<PlayFabRequestManager> PlayFabRequestManager::CreateInstance()
{
    auto ptr = std::make_shared<PlayFabRequestManager>();
    return ptr;
}

void PlayFabRequestManager::ThreadFunction()
{
    Aws::UniquePtr<Aws::Http::HttpClientFactory> httpClientFactory = Aws::MakeUnique<Aws::Http::HttpClientFactory>("PlayFabHttp");
    while (m_runThread)
    {
        HandleRequestBatch(httpClientFactory);
    }
}

void PlayFabRequestManager::HandleRequestBatch(const Aws::UniquePtr<Aws::Http::HttpClientFactory>& httpClientFactory)
{
    AZStd::unique_lock<AZStd::mutex> lock(m_requestMutex);
    m_requestConditionVar.wait(lock);

    // Swap queues
    AZStd::queue<PlayFabRequest*> requestsToHandle;
    requestsToHandle.swap(m_requestsToHandle);

    // Release lock
    lock.unlock();

    // Handle requests
    while (!requestsToHandle.empty())
    {
        HandleRequest(requestsToHandle.front(), httpClientFactory);
        requestsToHandle.pop();
    }
}

void PlayFabRequestManager::HandleRequest(PlayFabRequest* requestContainer, const Aws::UniquePtr<Aws::Http::HttpClientFactory>& httpClientFactory)
{
    std::shared_ptr<Aws::Http::HttpClient> httpClient = httpClientFactory->CreateHttpClient(Aws::Client::ClientConfiguration());

    auto httpRequest = httpClientFactory->CreateHttpRequest(requestContainer->mURI, requestContainer->mMethod, Aws::Utils::Stream::DefaultResponseStreamFactoryMethod);
    httpRequest->SetContentType("application/json");
    httpRequest->SetHeaderValue("X-PlayFabSDK", PlayFab::PlayFabSettings::playFabVersionString);
    if (requestContainer->mAuthKey.length() > 0)
        httpRequest->SetHeaderValue(requestContainer->mAuthKey, requestContainer->mAuthValue);

    auto sharedStream(Aws::MakeShared<Aws::StringStream>("PlayFabHttp Aws::StringStream"));
    *sharedStream << requestContainer->mRequestJsonBody;
    httpRequest->AddContentBody(sharedStream);
    httpRequest->SetContentLength(std::to_string(requestContainer->mRequestJsonBody.length()).c_str());

    std::shared_ptr<Aws::Http::HttpResponse> httpResponse = httpClient->MakeRequest(*httpRequest);

    requestContainer->mHttpCode = httpResponse->GetResponseCode();
    Aws::IOStream& responseStream = httpResponse->GetResponseBody();
    responseStream.seekg(0, SEEK_END);
    requestContainer->mResponseSize = responseStream.tellg();
    responseStream.seekg(0, SEEK_SET);
    requestContainer->mResponseText = new char[requestContainer->mResponseSize + 1];
    responseStream.read(requestContainer->mResponseText, requestContainer->mResponseSize);
    requestContainer->mResponseText[requestContainer->mResponseSize] = '\0';
    requestContainer->mResponseJson = new rapidjson::Document;
    requestContainer->mResponseJson->Parse<0>(requestContainer->mResponseText);
    requestContainer->mInternalCallback(requestContainer);
}
