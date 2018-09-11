#pragma once

#include <playfab/PlayFabError.h>
#include <playfab/PlayFabCallRequestContainerBase.h>

// Intellisense-only includes
#include <curl/curl.h>

#include <unordered_map>

namespace PlayFab
{
    typedef void(*RequestCompleteCallback)(CallRequestContainerBase& reqContainer);
    typedef std::shared_ptr<void> SharedVoidPointer;

    /// <summary>
    /// Internal PlayFabHttp container for each api call
    /// This object is reusable in its callback usage. 
    /// A user should not hold on to this explicit object, 
    /// but copy any needed info out of it in their callback.
    /// </summary>
    class CallRequestContainer : public CallRequestContainerBase
    {
    public:
        CallRequestContainer(const CallRequestContainerBase& base);

        virtual ~CallRequestContainer() override;

        // TODO: clean up these public variables with setters/getters when you have the chance.

        // I own these objects, I must always destroy them
        CURL* curlHandle;
        curl_slist* curlHttpHeaders;

        bool finished;
        std::string responseString;
        Json::Value responseJson = Json::Value::null;
        PlayFabError errorWrapper;
        std::function<void(CallRequestContainerBase&)> internalCallback;
        SharedVoidPointer successCallback;
    };
}
