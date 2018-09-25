#pragma once

#include <playfab/PlayFabError.h>
#include <playfab/PlayFabCallRequestContainerBase.h>

// Intellisense-only includes
#include <curl/curl.h>

#include <unordered_map>

namespace PlayFab
{
    /// <summary>
    /// Internal PlayFabHttp container for each api call
    /// </summary>
    class CallRequestContainer : public CallRequestContainerBase
    {
    public:
        CallRequestContainer(const CallRequestContainerBase& reqContainer);

        virtual ~CallRequestContainer() override;

        // TODO: clean up these public variables with setters/getters when you have the chance.

        // I own these objects, I must always destroy them
        CURL* curlHandle;
        curl_slist* curlHttpHeaders;

        bool finished;
        std::string responseString;
        Json::Value responseJson = Json::Value::null;
        PlayFabError errorWrapper;
        SharedVoidPointer successCallback;
        ErrorCallback errorCallback;
    };
}
