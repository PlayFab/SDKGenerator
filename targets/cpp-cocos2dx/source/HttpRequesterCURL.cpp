#include "HttpRequesterCURL.h"
#include "HttpRequest.h"

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

    network::HttpRequest* httpRequest = new network::HttpRequest();
    httpRequest->setRequestData(sBody.c_str(), sBody.length());
    httpRequest->setHeaders(rArrHeaders);
    httpRequest->setUrl(sURL.c_str());
    httpRequest->setRequestType(request->mMethod);
    httpRequest->setResponseCallback(CC_CALLBACK_2(HttpRequesterCURL::onRequestFinished, this));
    m_rMapRequests[httpRequest] = std::make_pair(request, callback);

    network::HttpClient* httpClient = network::HttpClient::getInstance();
    httpClient->send(httpRequest);
    httpRequest->release();
}

void HttpRequesterCURL::onRequestFinished(network::HttpClient* pCCHttpClient, network::HttpResponse* pCCHttpResponse)
{
    auto httpRequest = pCCHttpResponse->getHttpRequest();
    if (m_rMapRequests.find(httpRequest) != m_rMapRequests.end())
    {
        const auto& rPair = m_rMapRequests[httpRequest];

        if (rPair.second)
        {
            std::string sResponse = getDataFromResponse(pCCHttpResponse);
            rPair.first->AppendToResponse(sResponse);
            rPair.second(static_cast<int>(pCCHttpResponse->getResponseCode()), rPair.first, nullptr);
        }
        else
            delete rPair.first; // Request is released in callback, but not in this case.

        m_rMapRequests.erase(httpRequest);
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
    char* pData = reinterpret_cast<char*>(malloc(sizeof(char*) * (tSize + 1))); // +1 for the extra \0 character
    memcpy(pData, &(*pResponse->getResponseData())[0], tSize);
    pData[tSize] = 0;
    sRetValue = pData;
    free(pData);

    return sRetValue;
}
