#include <stdafx.h>

#include <playfab/PlayFabCallRequestContainer.h>

namespace PlayFab
{
    CallRequestContainer::CallRequestContainer() :
        curlHandle(nullptr),
        curlHttpHeaders(nullptr),
        customData(nullptr),
        finished(false),
        responseString(""),
        responseJson(Json::Value::null),
        errorWrapper(),
        internalCallback(nullptr),
        successCallback(nullptr),
        errorCallback(nullptr)
    {
    }

    CallRequestContainer::~CallRequestContainer()
    {
        curl_easy_reset(curlHandle);
        curlHttpHeaders = nullptr;
    }
}
