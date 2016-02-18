#include "playfab/HttpRequesterCURL.h"
#include "playfab/HttpRequest.h"


using namespace PlayFab;
USING_NS_CC;

HttpRequesterCURL::HttpRequesterCURL()
: m_iLastRequest(0)
{
}

HttpRequesterCURL::~HttpRequesterCURL()
{
    
}

PlayFabErrorCode HttpRequesterCURL::AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData)
{
    std::string sURL    = request->GetUrl();
    std::string sMethod = request->GetMethod();
    std::string sTag    = StringUtils::format("%d", ++m_iLastRequest);
    std::string sBody   = request->GetBody();
    std::vector<std::string> rArrHeaders;
    
    m_rMapRequests[sTag] = std::make_pair(request, callback);
    
    network::HttpRequest::Type eType = network::HttpRequest::Type::UNKNOWN;
    
    if (sMethod.compare("GET") == 0)
        eType = network::HttpRequest::Type::GET;
    else if (sMethod.compare("POST") == 0)
        eType = network::HttpRequest::Type::POST;
    else if (sMethod.compare("PUT") == 0)
        eType = network::HttpRequest::Type::PUT;
    else if (sMethod.compare("DELETE") == 0)
        eType = network::HttpRequest::Type::DELETE;
    
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
    pRequest->setRequestType(eType);
    pRequest->setResponseCallback( CC_CALLBACK_2(HttpRequesterCURL::onRequestFinished, this));
    pRequest->setTag(sTag.c_str());
    
    network::HttpClient::getInstance()->send(pRequest);
    pRequest->release();
    
    return PlayFabErrorSuccess;
}

void HttpRequesterCURL::onRequestFinished(network::HttpClient* pCCHttpClient, network::HttpResponse* pCCHttpResponse)
{
    std::string sTag = pCCHttpResponse->getHttpRequest()->getTag();
    
    if (m_rMapRequests.find(sTag) != m_rMapRequests.end())
    {
        const auto& rPair = m_rMapRequests[sTag];
        
        if (rPair.second)
        {
            std::string sResponse = getDataFromResponse(pCCHttpResponse);
            rPair.first->AppendToResponse(sResponse);
            rPair.second((int)pCCHttpResponse->getResponseCode(), rPair.first, nullptr);
        }
        else
            delete rPair.first; // Request is released in callback, but not in this case.
        
        m_rMapRequests.erase(sTag);
    }
}
std::string HttpRequesterCURL::getDataFromResponse(cocos2d::network::HttpResponse* pResponse)
{
    std::string sRetValue;
    
    size_t tSize = pResponse->getResponseData()->size();
    char* pData =(char*)malloc(sizeof(char*) * tSize);
    memcpy(pData, &(*pResponse->getResponseData())[0], tSize);
    pData[tSize] = 0;
    sRetValue = pData;
    free(pData);
    
    return sRetValue;
}
