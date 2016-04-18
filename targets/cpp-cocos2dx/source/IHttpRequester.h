#ifndef PLAYFAB_IHTTPREQUESTER_H_
#define PLAYFAB_IHTTPREQUESTER_H_

#include "PlayFabError.h"
#include "HttpRequest.h"

namespace PlayFab
{
    typedef void(*RequestCompleteCallback)(int httpStatus, HttpRequest* request, void* userData);

    class IHttpRequester
    {
    public:
        virtual void AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData) = 0;
        virtual int GetPendingCalls() const = 0;
        virtual ~IHttpRequester() {}
    };
}
#endif
