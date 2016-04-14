#include "HttpRequest.h"

using namespace PlayFab;

HttpRequest::HttpRequest(std::string method, std::string url)
    : mMethod(method), mUrl(url), mCompression(0), mAcceptGZip(true)
{

}

std::string HttpRequest::GetMethod() const
{
    return mMethod;
}

std::string HttpRequest::GetUrl() const
{
    return mUrl;
}

void HttpRequest::SetBody(std::string body)
{
    mBody = body;
}

std::string HttpRequest::GetBody() const
{
    return mBody;
}

void HttpRequest::CompressBody(int level /* = -1*/)
{
    mCompression = level;
}

void HttpRequest::AcceptGZip(bool accept /* = true*/)
{
    mAcceptGZip = accept;
}

bool HttpRequest::GetAcceptGZip()
{
    return mAcceptGZip;
}

int HttpRequest::GetCompressionLevel()
{
    return mCompression;
}

void HttpRequest::SetHeader(std::string key, std::string value)
{
    mHeaders.push_back( key + ": " + value );
}

bool HttpRequest::GetHeader(size_t index, std::string& header) const
{
    bool res = false;
    if( index < mHeaders.size())
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

void HttpRequest::SetResultCallback(void* callback)
{
    mResultCallback = callback;
}

void* HttpRequest::GetResultCallback()
{
    return mResultCallback;
}

void HttpRequest::SetErrorCallback(ErrorCallback callback)
{
    mErrorCallback = callback;
}

ErrorCallback HttpRequest::GetErrorCallback()
{
    return mErrorCallback;
}

void HttpRequest::SetUserData(void* data)
{
    mUserData = data;
}

void* HttpRequest::GetUserData()
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