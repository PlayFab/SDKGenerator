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
    CallRequestContainer::CallRequestContainer(const CallRequestContainerBase& base) :
        CallRequestContainerBase(base),
        curlHandle(nullptr),
        curlHttpHeaders(nullptr),
        finished(false),
        responseString(""),
        responseJson(Json::Value::null),
        errorWrapper(),
        internalCallback(nullptr),
        successCallback(nullptr)
    {
        errorWrapper.UrlPath = base.getUrl();

        Json::Value root;
        Json::Reader reader;
        bool parsingSuccessful = reader.parse(base.getRequestBody().c_str(), root);

        if(parsingSuccessful)
        {
            errorWrapper.Request = base.getRequestBody();
        }
        else
        {
            throw new std::invalid_argument("The requestBody string was not in a valid Json format during MakePostRequest.");
        }
    }

    CallRequestContainer::~CallRequestContainer()
    {
        curl_easy_reset(curlHandle);
        curlHttpHeaders = nullptr;
    }
}
