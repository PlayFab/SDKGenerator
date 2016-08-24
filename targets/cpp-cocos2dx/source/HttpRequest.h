#ifndef PLAYFAB_HTTPREQUEST_H_
#define PLAYFAB_HTTPREQUEST_H_

#include <string>
#include <vector>
#include <cocos/network/HttpClient.h>

#include "PlayFabError.h"
#include "PlayFabBaseModel.h"

namespace PlayFab
{
    typedef std::shared_ptr<void> SharedVoidPointer;

    struct HttpRequest // TODO: Rename to CallRequestContainer to match other sdks
    {
        HttpRequest(std::string method, std::string url);
        ~HttpRequest();

        void SetBody(std::string body);
        void CompressBody(int level = -1);
        int GetCompressionLevel() const;

        void SetResultCallback(SharedVoidPointer callback);
        SharedVoidPointer GetResultCallback() const;

        void SetErrorCallback(ErrorCallback callback);
        ErrorCallback GetErrorCallback() const;

        void SetUserData(void* data);
        void* GetUserData() const;

        void AcceptGZip(bool accept = true);
        bool GetAcceptGZip() const;

        void SetHeader(std::string key, std::string value);
        bool GetHeader(size_t index, std::string& header) const;
        size_t GetHeaderCount() const;

        void AppendToResponse(std::string text);
        std::string GetReponse() const;

        bool mAcceptGZip;
        int mCompression;
        std::string mUrl;
        cocos2d::network::HttpRequest::Type mMethod;
        std::string mBody;
        std::vector<std::string> mHeaders;

        SharedVoidPointer mResultCallbackFunc = nullptr;
        ErrorCallback mErrorCallback;
        void* mUserData;

        std::string mResponse;
    };

};

#endif
