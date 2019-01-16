#include <stdafx.h>

#include <playfab/PlayFabCallRequestContainer.h>

namespace PlayFab
{
    CallRequestContainer::CallRequestContainer(std::string url,
        const std::unordered_map<std::string, std::string>& headers,
        std::string requestBody,
        CallRequestContainerCallback callback,
        void* customData,
        std::shared_ptr<PlayFabApiSettings> settings) :
        CallRequestContainerBase(url, headers, requestBody, callback, customData, settings),
        finished(false),
        responseString(""),
        responseJson(Json::Value::null),
        errorWrapper(),
        successCallback(nullptr),
        errorCallback(nullptr)
    {
        errorWrapper.UrlPath = url;

        Json::Value request;
        Json::Reader reader;
        bool parsingSuccessful = reader.parse(requestBody, request);

        if (parsingSuccessful)
        {
            errorWrapper.Request = request;
        }
    }

    CallRequestContainer::~CallRequestContainer()
    {
    }
}
