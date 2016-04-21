#ifndef PLAYFAB_HTTPREQUESTERCURL_H_
#define PLAYFAB_HTTPREQUESTERCURL_H_

#include "IHttpRequester.h"
#include <cocos/network/HttpClient.h>

namespace PlayFab
{
    class HttpRequesterCURL : public IHttpRequester
    {
    public:
        HttpRequesterCURL();
        ~HttpRequesterCURL();

        void AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData) override;
        int GetPendingCalls() const override;

    private:
        struct CurlRequest
        {
            void* handle;
            void* headers;
            char* body;
            HttpRequest* request;
            void* callbackData;
        };

        void onRequestFinished(cocos2d::network::HttpClient* pCCHttpClient, cocos2d::network::HttpResponse* pCCHttpResponse);
        static std::string getDataFromResponse(cocos2d::network::HttpResponse* pResponse);

        std::map<cocos2d::network::HttpRequest*, std::pair<HttpRequest*, RequestCompleteCallback>> m_rMapRequests;
    };
}

#endif
