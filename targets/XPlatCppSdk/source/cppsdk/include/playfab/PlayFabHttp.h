#pragma once

#include <playfab/PlayFabError.h>
#include <playfab/PlayFabPluginManager.h>
#include <functional>
#include <memory>
#include <thread>
#include <mutex>

// Intellisense-only includes
#include <curl/curl.h>
#ifndef _WIN32
#include <jsoncpp/json/value.h>
#endif
#ifdef _WIN32
#include <json/value.h>
#endif

namespace PlayFab
{
    typedef void(*RequestCompleteCallback)(CallRequestContainer reqContainer);
    typedef std::shared_ptr<void> SharedVoidPointer;

    /// <summary>
    /// Internal PlayFabHttp container for each api call
    /// </summary>
    struct CallRequestContainer
    {
        // I own these objects, I must always destroy them
        CURL* curlHandle;
        curl_slist* curlHttpHeaders;
        // I never own this, I can never destroy it
        void* customData;

        bool finished;
        std::string authKey;
        std::string authValue;
        std::string responseString;
        Json::Value responseJson = Json::Value::null;
        PlayFabError errorWrapper;
        RequestCompleteCallback internalCallback;
        SharedVoidPointer successCallback;
        ErrorCallback errorCallback;

        CallRequestContainer();
        ~CallRequestContainer();
    };

    /// <summary>
    /// Provides an interface and a static instance for https implementations
    /// </summary>
    class IPlayFabHttp 
    {
    public:
        static IPlayFabHttp& Get();

        virtual ~IPlayFabHttp();

        virtual size_t Update() = 0;
    protected:
        static std::unique_ptr<IPlayFabHttp> httpInstance;
        virtual void InternalAddRequest(const std::string& urlPath, const std::string& authKey, const std::string& authValue, const Json::Value& requestBody, RequestCompleteCallback internalCallback, SharedVoidPointer successCallback, ErrorCallback errorCallback, void* customData) = 0;
    };

    /// <summary>
    /// PlayFabHttp is the default https implementation for Win/C++, using cpprestsdk
    /// </summary>
    class PlayFabHttp : public IPlayFabHttp, public IPlayFabHttpTransportPlugin
    {
    public:
        static void MakeInstance();
        ~PlayFabHttp();

        virtual void AddRequest(
            const std::string& urlPath,
            const std::string& authKey,
            const std::string& authValue,
            const std::string& requestBody, // dev note: Used to be Json::Value&
            std::function<void(CallRequestContainer)> callback) override; // dev note: used to hard code this callback?

        size_t Update();
    private:

        void InternalAddRequest(const std::string& urlPath, const std::string& authKey, const std::string& authValue, const Json::Value& requestBody, RequestCompleteCallback internalCallback, SharedVoidPointer successCallback, ErrorCallback errorCallback, void* customData);

        PlayFabHttp(); // Private constructor, to enforce singleton instance
        PlayFabHttp(const PlayFabHttp& other); // Private copy-constructor, to enforce singleton instance

        static size_t CurlReceiveData(char* buffer, size_t blockSize, size_t blockCount, void* userData);
        static void ExecuteRequest(CallRequestContainer& reqContainer);
        void WorkerThread();
        static void HandleCallback(CallRequestContainer& reqContainer);
        static void HandleResults(CallRequestContainer& reqContainer);

        std::thread pfHttpWorkerThread;
        std::mutex httpRequestMutex;
        bool threadRunning;
        int activeRequestCount;
        std::vector<CallRequestContainer*> pendingRequests;
        std::vector<CallRequestContainer*> pendingResults;
    };
}
