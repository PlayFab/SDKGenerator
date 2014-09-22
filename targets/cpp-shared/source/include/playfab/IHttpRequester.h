#ifndef PLAYFAB_IHTTPREQUESTER_H_
#define PLAYFAB_IHTTPREQUESTER_H_

#include "playfab/PlayFabError.h"
#include "playfab/HttpRequest.h"
#include <vector>

namespace PlayFab
{

    typedef void (*RequestCompleteCallback)(int httpStatus, HttpRequest* request, void* userData);

    class IHttpRequester
    {
    public:
        virtual PlayFabErrorCode AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData) = 0;
       // {
        //    mRequests.push_back(request);
        //    return PlayFabErrorCode::Success;
        //}

        virtual size_t UpdateRequests() = 0;
        virtual ~IHttpRequester() {}

    protected:
        //std::vector<HttpRequest*> mRequests;
    };

}
#endif