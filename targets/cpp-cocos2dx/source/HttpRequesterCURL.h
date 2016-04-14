#ifndef PLAYFAB_HTTPREQUESTERCURL_H_
#define PLAYFAB_HTTPREQUESTERCURL_H_

#include "IHttpRequester.h"

namespace PlayFab
{

    class HttpRequesterCURL : public IHttpRequester
    {
    public:
        HttpRequesterCURL();
        ~HttpRequesterCURL();

        virtual PlayFabErrorCode AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData);
        virtual size_t UpdateRequests();

    private:
        struct CurlRequest
        {
            void* handle;
            void* headers;
            char* body;
            RequestCompleteCallback callback;
            HttpRequest* request;
            void* callbackData;
        };

        void FinalizeRequests();
        void CleanupRequest(CurlRequest request);
        static size_t Write(void* responseData, size_t dataSize, size_t dataLength, void* customData);

        std::vector<CurlRequest> mHandles;
        void* mHandle;
    };

}

#endif