#ifndef PLAYFAB_HTTPREQUEST_H_
#define PLAYFAB_HTTPREQUEST_H_

#include <string>
#include <vector>

#include "PlayFabError.h"

namespace PlayFab
{

    class HttpRequest
    {
    public:
        HttpRequest(std::string method, std::string url);

        std::string GetMethod() const;
        std::string GetUrl() const;

        void SetBody(std::string body);
        std::string GetBody() const;
        void CompressBody(int level = -1);
        int GetCompressionLevel();

        void SetResultCallback(void* callback);
        void* GetResultCallback();

        void SetErrorCallback(ErrorCallback callback);
        ErrorCallback GetErrorCallback();

        void SetUserData(void* data);
        void* GetUserData();

        void AcceptGZip(bool accept = true);
        bool GetAcceptGZip();

        void SetHeader(std::string key, std::string value);
        bool GetHeader(size_t index, std::string& header) const;
        size_t GetHeaderCount() const;

        void AppendToResponse(std::string text);
        std::string GetReponse() const;

    private:
        bool mAcceptGZip;
        int mCompression;
        std::string mUrl;
        std::string mMethod;
        std::string mBody;
        std::vector<std::string> mHeaders;

        void* mResultCallback;
        ErrorCallback mErrorCallback;
        void* mUserData;

        std::string mResponse;
    };

};

#endif