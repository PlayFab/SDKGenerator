#include "HttpRequest.h"

using namespace PlayFab;

HttpRequest::HttpRequest(std::string method, std::string url)
    : mMethod(cocos2d::network::HttpRequest::Type::POST), mUrl(url), mCompression(0), mAcceptGZip(true)
{

}

HttpRequest::~HttpRequest()
{

}

void HttpRequest::SetBody(std::string body)
{
    mBody = body;
}

void HttpRequest::CompressBody(int level /* = -1*/)
{
    mCompression = level;
}

void HttpRequest::AcceptGZip(bool accept /* = true*/)
{
    mAcceptGZip = accept;
}

bool HttpRequest::GetAcceptGZip() const
{
    return mAcceptGZip;
}

int HttpRequest::GetCompressionLevel() const
{
    return mCompression;
}

void HttpRequest::SetHeader(std::string key, std::string value)
{
    mHeaders.push_back(key + ": " + value);
}

bool HttpRequest::GetHeader(size_t index, std::string& header) const
{
    bool res = false;
    if (index < mHeaders.size())
    {
        header = mHeaders[index];
        res = true;
    }

    return res;
}

size_t HttpRequest::GetHeaderCount() const
{
    return mHeaders.size();
}

void HttpRequest::SetResultCallback(SharedVoidPointer callback)
{
    mResultCallbackFunc = callback;
}

PlayFab::SharedVoidPointer HttpRequest::GetResultCallback() const
{
    return mResultCallbackFunc;
}

void HttpRequest::SetErrorCallback(ErrorCallback callback)
{
    mErrorCallback = callback;
}

ErrorCallback HttpRequest::GetErrorCallback() const
{
    return mErrorCallback;
}

void HttpRequest::SetUserData(void* data)
{
    mUserData = data;
}

void* HttpRequest::GetUserData() const
{
    return mUserData;
}

void HttpRequest::AppendToResponse(std::string text)
{
    mResponse.append(text);
}

std::string HttpRequest::GetReponse() const
{
    return mResponse;
}
