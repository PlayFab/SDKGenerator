#pragma once

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <playfab/PlayFabError.h>
#include <functional>
#include <deque>
#include <memory>
#include <thread>
#include <mutex>

#ifndef _WIN32
#include <jsoncpp/json/value.h>
#endif
#ifdef _WIN32
#include <json/value.h>
#endif

namespace PlayFab
{
    /// <summary>
    /// PlayFabHttp is the default https implementation for Win/C++, using cpprestsdk
    /// </summary>
    class PlayFabHttp : public IPlayFabHttpPlugin
    {
    public:
        PlayFabHttp();
        PlayFabHttp(const PlayFabHttp& other) = delete;
        PlayFabHttp(PlayFabHttp&& other) = delete;
        PlayFabHttp& operator=(PlayFabHttp&& other) = delete;
        virtual ~PlayFabHttp();

        virtual void MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer) override;
        virtual size_t Update() override;

    private:
        static size_t CurlReceiveData(char* buffer, size_t blockSize, size_t blockCount, void* userData);
        void ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer);
        void WorkerThread();
        void HandleCallback(std::unique_ptr<CallRequestContainer> requestContainer);
        void HandleResults(std::unique_ptr<CallRequestContainer> requestContainer);

        std::thread workerThread;
        std::mutex httpRequestMutex;
        bool threadRunning;
        int activeRequestCount;
        std::deque<std::unique_ptr<CallRequestContainerBase>> pendingRequests;
        std::deque<std::unique_ptr<CallRequestContainerBase>> pendingResults;
    };
}

