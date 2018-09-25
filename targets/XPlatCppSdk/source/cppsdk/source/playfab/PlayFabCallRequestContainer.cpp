#include <stdafx.h>

#include <playfab/PlayFabCallRequestContainer.h>

#ifndef _WIN32
#include <jsoncpp/json/reader.h>
#endif
#ifdef _WIN32
#include <json/reader.h>
#endif


namespace PlayFab
{
    CallRequestContainer::CallRequestContainer(const CallRequestContainerBase& reqContainer) :
        CallRequestContainerBase(reqContainer),
        curlHandle(nullptr),
        curlHttpHeaders(nullptr),
        finished(false),
        responseString(""),
        responseJson(Json::Value::null),
        errorWrapper(),
        successCallback(nullptr),
        errorCallback(nullptr)
    {
        errorWrapper.UrlPath = reqContainer.getUrl();

        Json::Value request;
        Json::Reader reader;
        bool parsingSuccessful = reader.parse(reqContainer.getRequestBody(), request);

        if (parsingSuccessful)
        {
            errorWrapper.Request = request;
        }
        else
        {
            throw new std::invalid_argument("The requestBody string is not in a valid Json format.");
        }
    }

    CallRequestContainer::~CallRequestContainer()
    {
        curl_easy_reset(curlHandle);
        curlHttpHeaders = nullptr;
    }
}
