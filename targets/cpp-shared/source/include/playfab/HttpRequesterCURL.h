#ifndef PLAYFAB_HTTPREQUESTERCURL_H_
#define PLAYFAB_HTTPREQUESTERCURL_H_

#include "playfab/IHttpRequester.h"
#include <cocos/network/HttpClient.h>

namespace PlayFab
{
    
    class HttpRequesterCURL : public IHttpRequester
    {
    public:
        HttpRequesterCURL();
        ~HttpRequesterCURL();
        
        virtual PlayFabErrorCode AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData);
        
    private:
        void onRequestFinished(cocos2d::network::HttpClient* pCCHttpClient, cocos2d::network::HttpResponse* pCCHttpResponse);
        std::string getDataFromResponse(cocos2d::network::HttpResponse* pResponse);
        
    private:
        struct CurlRequest
        {
            void* handle;
            void* headers;
            char* body;
            ;
            HttpRequest* request;
            void* callbackData;
        };
        
        std::map<std::string, std::pair<HttpRequest*, RequestCompleteCallback>> m_rMapRequests;
        int32                                                                   m_iLastRequest;
    };
    
}

#endif