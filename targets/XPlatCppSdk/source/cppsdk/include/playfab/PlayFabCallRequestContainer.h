#pragma once

#include <playfab/PlayFabError.h>

// Intellisense-only includes
#include <curl/curl.h>

namespace PlayFab
{
    class CallRequestContainerBase
    {
    public:
        CallRequestContainerBase(){};
        virtual ~CallRequestContainerBase(){};
    };

    typedef void(*RequestCompleteCallback)(CallRequestContainerBase& reqContainer);
    typedef std::shared_ptr<void> SharedVoidPointer;

    /// <summary>
    /// Internal PlayFabHttp container for each api call
    /// </summary>
    class CallRequestContainer : public CallRequestContainerBase
    {
    public:
        CallRequestContainer();
        virtual ~CallRequestContainer() override;

        // TODO: clean up these public variables with setters/getters when you have the chance.

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
    };
}
