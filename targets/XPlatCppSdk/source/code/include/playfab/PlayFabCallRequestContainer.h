#pragma once

#include <playfab/PlayFabError.h>
#include <playfab/PlayFabCallRequestContainerBase.h>

namespace PlayFab
{
    /// <summary>
    /// Internal PlayFabHttp container for each api call
    /// </summary>
    class CallRequestContainer : public CallRequestContainerBase
    {
    public:
        CallRequestContainer(std::string url,
            const std::unordered_map<std::string, std::string>& headers,
            std::string requestBody,
            CallRequestContainerCallback callback,
            void* customData = nullptr,
            std::shared_ptr<PlayFabApiSettings> apiSettings = nullptr);

        virtual ~CallRequestContainer() override;
        std::string GetFullUrl() const;

        // TODO: clean up these public variables with setters/getters when you have the chance.

        bool finished;
        std::string responseString;
        Json::Value responseJson = Json::Value::null;
        PlayFabError errorWrapper;
        std::shared_ptr<void> successCallback;
        ErrorCallback errorCallback;
    };

#ifndef DISABLE_ONEDS_API
    class OneDSCallRequestContainer : public CallRequestContainer
    {
    public:
        OneDSCallRequestContainer(const std::unordered_map<std::string, std::string>& headers,
            std::vector<uint8_t> requestBody,
            CallRequestContainerCallback callback,
            void* customData = nullptr,
            std::shared_ptr<PlayFabApiSettings> apiSettings = nullptr):
            CallRequestContainer("", headers, "", callback, customData, apiSettings),
            requestBinaryBody(std::move(requestBody))
        {
        }

        std::vector<uint8_t> requestBinaryBody;
    };
#endif
}
