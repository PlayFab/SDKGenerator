#include <stdafx.h>

#include <playfab/PlayFabCallRequestContainer.h>

namespace PlayFab
{
    CallRequestContainerBase::CallRequestContainerBase(
        std::string url,
        const std::unordered_map<std::string, std::string>& headers,
        std::string requestBody,
        CallRequestContainerCallback callback,
        void* customData) :
        mUrl(url),
        mHeaders(headers),
        mRequestBody(requestBody),
        mCallback(callback),
        mCustomData(customData)
    {
    }

    CallRequestContainerBase::CallRequestContainerBase(const CallRequestContainerBase& otherContainer)
    {
        *this = otherContainer;
    }

    const CallRequestContainerBase& CallRequestContainerBase::operator=(const CallRequestContainerBase& otherContainer)
    {
        if (this != &otherContainer)
        {
            this->mUrl = otherContainer.mUrl;
            this->mHeaders = otherContainer.mHeaders;
            this->mRequestBody = otherContainer.mRequestBody;
            this->mCallback = otherContainer.mCallback;
            this->mCustomData = otherContainer.mCustomData;
        }

        return *this;
    }

    CallRequestContainerBase::~CallRequestContainerBase()
    {
    }

    std::string CallRequestContainerBase::getUrl() const
    {
        return mUrl;
    }

    std::unordered_map<std::string, std::string> CallRequestContainerBase::getHeaders() const
    {
        return mHeaders;
    }

    std::string CallRequestContainerBase::getRequestBody() const
    {
        return mRequestBody;
    }

    CallRequestContainerCallback CallRequestContainerBase::getCallback() const
    {
        return mCallback;
    }

    void* CallRequestContainerBase::getCustomData() const
    {
        return mCustomData;
    }
}
