#include "playfab/HttpRequesterCURL.h"
#include "playfab/HttpRequest.h"

#include <curl/curl.h>

#include "playfab/PlayFabZlib.h"

#define CHUNK 0x4000

using namespace PlayFab;

unsigned long GetMaxCompressedLen(unsigned long nLenSrc)
{
    unsigned long n16kBlocks = ( nLenSrc + 16383 ) / 16384;
    return  (nLenSrc + 6 + (n16kBlocks * 5) );
}


HttpRequesterCURL::HttpRequesterCURL()
{
    mHandle = curl_multi_init();
}

HttpRequesterCURL::~HttpRequesterCURL()
{
    for(size_t i = 0; i < mHandles.size(); ++i)
    {
        CleanupRequest(mHandles[i]);
    }


    curl_multi_cleanup(mHandle);
}

PlayFabErrorCode HttpRequesterCURL::AddRequest(HttpRequest* request, RequestCompleteCallback callback, void* callbackData)
{
    PlayFabErrorCode res = PlayFabErrorSuccess;

    curl_slist* headers = NULL;
    
    CURL* handle = curl_easy_init();
    if(handle != NULL)
    {
        for(size_t i = 0; i < request->GetHeaderCount(); ++i)
        {
            std::string header;
            if(request->GetHeader(i, header))
            {
                headers = curl_slist_append(headers, header.c_str());
            }
        }


        std::string body = request->GetBody();
        char* buffer = NULL;
        size_t bodyLen = 0;
        int compressionLevel = 0; //request->GetCompressionLevel(); Temporarily disabled due to problems
        if(compressionLevel != 0)
        {
            unsigned long ret = 0;
            if(body.length() > 0)
            {
                std::string tempString;
                unsigned char out_buffer[CHUNK];
    
                z_stream zStream;
                zStream.zalloc = Z_NULL;
                zStream.zfree = Z_NULL;
                zStream.opaque = Z_NULL;
                ret = deflateInit2(&zStream, compressionLevel, Z_DEFLATED, 15 | 16, 8, Z_DEFAULT_STRATEGY);
                if(ret == Z_OK)
                {

                    zStream.next_in = (Bytef*)body.c_str();
                    zStream.avail_in = (uInt)body.length();

                    do
                    {
                        zStream.next_out = (Bytef*)out_buffer;
                        zStream.avail_out = CHUNK;

                        ret = deflate(&zStream, Z_FINISH);
                        int have = CHUNK - zStream.avail_out;
                        tempString.append((const char*)out_buffer, have);
                        /*if(ret == Z_STREAM_END)
                        {
                            ret = zStream.total_out;
                        }*/
                    }
                    while(zStream.avail_out == 0);
                }
                deflateEnd(&zStream);

                bodyLen = tempString.length();
                buffer = new char[bodyLen+1];
                memcpy(buffer, tempString.c_str(), bodyLen);
                buffer[bodyLen] = 0;

                headers = curl_slist_append(headers, "Content-Encoding: gzip");

            }
        }
        else if(body.length() > 0)
        {
            bodyLen = body.length();
            buffer = new char[body.length()+1];
            std::strncpy(buffer, body.c_str(), body.length());
        }

#if LOCALHOST_PROXY
        curl_easy_setopt(handle, CURLOPT_PROXY, "127.0.0.1:8888");
#endif
        //Accept-Encoding: gzip
        if(request->GetAcceptGZip())
        {
            curl_easy_setopt(handle, CURLOPT_ENCODING, "gzip");
        }

        curl_easy_setopt(handle, CURLOPT_URL, request->GetUrl().c_str());
        curl_easy_setopt(handle, CURLOPT_CUSTOMREQUEST, request->GetMethod().c_str());
        
        if(headers != NULL)
        {
            curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
        }

        if(buffer != NULL)
        {
            curl_easy_setopt(handle, CURLOPT_POSTFIELDSIZE, bodyLen);
            curl_easy_setopt(handle, CURLOPT_POSTFIELDS, buffer);
        }

        //Note: Peer certifcates were not validating in early tests.
        curl_easy_setopt(handle, CURLOPT_SSL_VERIFYPEER, 0L);
        
        curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, HttpRequesterCURL::Write);
        curl_easy_setopt(handle, CURLOPT_WRITEDATA, request);

        CurlRequest curlRequest =
        {
            handle,
            headers,
            buffer,
            callback,
            request,
            callbackData
        };
        mHandles.push_back(curlRequest);

        curl_multi_add_handle(mHandle, handle);

        //IHttpRequester::AddRequest(request, callback, callbackData);
    }

    return res;
}

size_t HttpRequesterCURL::UpdateRequests()
{
    size_t numActiveRequests = mHandles.size();
    if( numActiveRequests > 0 )
    {
        curl_multi_perform(mHandle, (int*)&numActiveRequests);
    
        if(numActiveRequests < mHandles.size())
        {
            FinalizeRequests();
        }
    }

    return numActiveRequests;
}

void HttpRequesterCURL::FinalizeRequests()
{
    long httpResponseStatus = 0;
    int queuedMessages = 0;
    CURLMsg* msg = NULL;
    while((msg = curl_multi_info_read(mHandle, &queuedMessages)))
    {
        for(size_t i = 0; i < mHandles.size(); ++i)
        {
            if(mHandles[i].handle == msg->easy_handle)
            {
                CurlRequest request = mHandles[i];

                curl_easy_getinfo(request.handle, CURLINFO_RESPONSE_CODE, &httpResponseStatus);

                if(request.callback != NULL)
                {
                    request.callback((int)httpResponseStatus, request.request, request.callbackData);
                }

                CleanupRequest(request);
                mHandles.erase(mHandles.begin() + i);
                break;
            }
        }
    }
}

void HttpRequesterCURL::CleanupRequest(CurlRequest request)
{
    if(request.headers != NULL)
    {
        curl_slist_free_all((curl_slist*)request.headers);
    }

    curl_easy_cleanup(request.handle);

    if( request.body != NULL)
    {
        delete request.body;
        request.body = NULL;
    }
}

size_t HttpRequesterCURL::Write(void* responseData, size_t dataSize, size_t dataLength, void* customData)
{
    HttpRequest* request = (HttpRequest*)customData;
    char* data = (char*)responseData;
    data[dataSize * dataLength] = '\0';

    request->AppendToResponse((char*)responseData);

    return dataSize * dataLength;
}