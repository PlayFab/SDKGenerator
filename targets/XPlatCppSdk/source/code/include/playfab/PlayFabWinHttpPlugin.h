#pragma once

#include <playfab/PlayFabCallRequestContainer.h>
#include <playfab/PlayFabPluginManager.h>
#include <thread>
#include <mutex>
#include <atomic>
#include <windows.h>
#include <winhttp.h>

namespace PlayFab
{
    /// <summary>
    /// PlayFabWinHttpPlugin is an https implementation to interact with PlayFab services using WinHTTP.
    /// </summary>
    class PlayFabWinHttpPlugin : public IPlayFabHttpPlugin
    {
    public:
        PlayFabWinHttpPlugin();
        PlayFabWinHttpPlugin(const PlayFabWinHttpPlugin& other) = delete;
        PlayFabWinHttpPlugin(PlayFabWinHttpPlugin&& other) = delete;
        PlayFabWinHttpPlugin& operator=(PlayFabWinHttpPlugin&& other) = delete;
        virtual ~PlayFabWinHttpPlugin();

        virtual void MakePostRequest(std::unique_ptr<CallRequestContainerBase> requestContainer) override;
        virtual size_t Update() override;

    protected:
        virtual void ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer);
        virtual std::string GetUrl(CallRequestContainer& requestContainer) const;
        virtual void SetPredefinedHeaders(CallRequestContainer& requestContainer, HINTERNET hRequest);
        virtual bool GetBinaryPayload(CallRequestContainer& requestContainer, LPVOID& payload, DWORD& payloadSize) const;
        virtual void ProcessResponse(CallRequestContainer& requestContainer, const int httpCode);
        void WorkerThread();
        void HandleCallback(std::unique_ptr<CallRequestContainer> requestContainer);
        void HandleResults(std::unique_ptr<CallRequestContainer> requestContainer);
        void SetErrorInfo(CallRequestContainer& requestContainer, const std::string& errorMessage, const int httpCode = 0) const;

        std::thread workerThread;
        std::mutex httpRequestMutex;
        std::atomic<bool> threadRunning;
        int activeRequestCount;
        std::deque<std::unique_ptr<CallRequestContainerBase>> pendingRequests;
        std::deque<std::unique_ptr<CallRequestContainerBase>> pendingResults;
    };
}
