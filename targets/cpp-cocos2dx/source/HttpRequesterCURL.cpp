#include "HttpRequesterCURL.h"
#include "HttpRequest.h"

#if CC_TARGET_PLATFORM == CC_PLATFORM_ANDROID
#include <string>
#include <sstream>

namespace std {
    template <typename T>
    string to_string(T value)
    {
        ostringstream os;
        os << value;
        return os.str();
    }
}
#endif

using namespace PlayFab;
USING_NS_CC;

HttpRequesterCURL::HttpRequesterCURL()
{
}

HttpRequesterCURL::~HttpRequesterCURL()
{
}

int HttpRequesterCURL::GetPendingCalls() const
{
    return m_rMapRequests.size();
}

void HttpRequesterCURL::AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData)
{
    std::string sURL = request->mUrl;
    std::string sBody = request->mBody;
    std::vector<std::string> rArrHeaders;

    std::string sHeader;
    for (ssize_t tIndex = 0; tIndex < request->GetHeaderCount(); tIndex++)
    {
        if (request->GetHeader(tIndex, sHeader))
            rArrHeaders.push_back(sHeader);
    }

    network::HttpRequest* pRequest = new network::HttpRequest();
    pRequest->setRequestData(sBody.c_str(), sBody.length());
    pRequest->setHeaders(rArrHeaders);
    pRequest->setUrl(sURL.c_str());
    pRequest->setRequestType(request->mMethod);
    pRequest->setResponseCallback(CC_CALLBACK_2(HttpRequesterCURL::onRequestFinished, this));

    network::HttpClient* httpClient = network::HttpClient::getInstance();
    m_rMapRequests[httpClient] = std::make_pair(request, callback);
    httpClient->send(pRequest);
    pRequest->release();
}

void HttpRequesterCURL::onRequestFinished(network::HttpClient* pCCHttpClient, network::HttpResponse* pCCHttpResponse)
{
    if (m_rMapRequests.find(pCCHttpClient) != m_rMapRequests.end())
    {
        const auto& rPair = m_rMapRequests[pCCHttpClient];

        if (rPair.second)
        {
            std::string sResponse = getDataFromResponse(pCCHttpResponse);
            rPair.first->AppendToResponse(sResponse);
            rPair.second(static_cast<int>(pCCHttpResponse->getResponseCode()), rPair.first, nullptr);
        }
        else
            delete rPair.first; // Request is released in callback, but not in this case.

        m_rMapRequests.erase(pCCHttpClient);
    }
    else
    {
        // This is super bad.  There's a bunch of memory leaks, and the call never returns, etc etc.
        CCLOG("%s", "Critical error, HttpClient callback did not match a pending request.");
    }
}

std::string HttpRequesterCURL::getDataFromResponse(cocos2d::network::HttpResponse* pResponse)
{
    std::string sRetValue;

    size_t tSize = pResponse->getResponseData()->size();
    char* pData = reinterpret_cast<char*>(malloc(sizeof(char*) * tSize));
    memcpy(pData, &(*pResponse->getResponseData())[0], tSize);
    pData[tSize] = 0;
    sRetValue = pData;
    free(pData);

    return sRetValue;
}
