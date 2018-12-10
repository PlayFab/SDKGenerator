#pragma once

#include <playfab/PlayFabError.h>
#include <playfab/PlayFabCallRequestContainerBase.h>

// Intellisense-only includes
#include <curl/curl.h>

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
            void* customData = nullptr);

        virtual ~CallRequestContainer() override;

        // TODO: clean up these public variables with setters/getters when you have the chance.

        // I own these objects, I must always destroy them
        CURL* curlHandle;
        curl_slist* curlHttpHeaders;

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
            void* customData = nullptr):
            CallRequestContainer("", headers, "", callback, customData),
            requestBinaryBody(std::move(requestBody))
        {
        }

        std::vector<uint8_t> requestBinaryBody;
    };
#endif
}
