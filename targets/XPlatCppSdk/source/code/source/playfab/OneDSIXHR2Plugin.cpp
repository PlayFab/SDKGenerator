#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSIXHR2Plugin.h>

#include <playfab/PlayFabTransportHeaders.h>

namespace PlayFab
{
    void OneDSIXHR2Plugin::SetupRequestHeaders(const OneDSCallRequestContainer& reqContainer, std::vector< HttpHeaderInfo>& headers)
    {
        HttpHeaderInfo acceptHeader;
        acceptHeader.wstrHeaderName = L"Accept";
        acceptHeader.wstrHeaderValue = L"*/*";
        headers.push_back(std::move(acceptHeader));

        HttpHeaderInfo clientIdHeader;
        clientIdHeader.wstrHeaderName = L"Client-Id";
        clientIdHeader.wstrHeaderValue = L"NO_AUTH";
        headers.push_back(std::move(clientIdHeader));

        HttpHeaderInfo contentHeader;
        contentHeader.wstrHeaderName = L"Content-Type";
        contentHeader.wstrHeaderValue = L"application/bond-compact-binary";
        headers.push_back(std::move(contentHeader));

        HttpHeaderInfo expectHeader;
        expectHeader.wstrHeaderName = L"Expect";
        expectHeader.wstrHeaderValue = L"100-continue";
        headers.push_back(std::move(expectHeader));

        HttpHeaderInfo sdkVersionHeader;
        sdkVersionHeader.wstrHeaderName = L"SDK-Version";
        sdkVersionHeader.wstrHeaderValue = L"EVT-PlayFab-XPlat-C++-No-3.0.275.1";
        headers.push_back(std::move(sdkVersionHeader));

        int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        HttpHeaderInfo uploadTimeHeader;
        uploadTimeHeader.wstrHeaderName = L"Upload-Time";
        uploadTimeHeader.wstrHeaderValue = std::to_wstring(now);
        headers.push_back(std::move(uploadTimeHeader));

        HttpHeaderInfo contentLengthHeader;
        contentLengthHeader.wstrHeaderName = L"Content-Length";
        contentLengthHeader.wstrHeaderValue = std::to_wstring(reqContainer.requestBinaryBody.size());
        headers.push_back(std::move(contentLengthHeader));

        HttpHeaderInfo connectionHeader;
        connectionHeader.wstrHeaderName = L"Connection";
        connectionHeader.wstrHeaderValue = L"Keep-Alive";
        headers.push_back(std::move(connectionHeader));

        HttpHeaderInfo cacheHeader;
        cacheHeader.wstrHeaderName = L"Cache-Control";
        cacheHeader.wstrHeaderValue = L"no-cache";
        headers.push_back(std::move(cacheHeader));
        
        auto reqHeaders = reqContainer.GetHeaders();

        if (reqHeaders.size() > 0)
        {
            for (auto const &obj : reqHeaders)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    HttpHeaderInfo hInfo;
                    hInfo.wstrHeaderName = std::wstring(obj.first.begin(), obj.first.end());
                    hInfo.wstrHeaderValue = std::wstring(obj.second.begin(), obj.second.end());
                    headers.push_back(std::move(hInfo));
                }
            }
        }
    }

    void OneDSIXHR2Plugin::ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        OneDSCallRequestContainer& reqContainer = (OneDSCallRequestContainer&)*requestContainer;

        // Create request
        HttpRequest postEventRequest;

        // Setup headers
        std::vector<HttpHeaderInfo> headers;
        SetupRequestHeaders(reqContainer, headers);

        // Setup url
        std::wstring url = L"https://self.events.data.microsoft.com/OneCollector/1.0/";

        // Send post request
        postEventRequest.Open(
            L"POST",
            url,
            headers,
            reqContainer.requestBinaryBody.data(),
            reqContainer.requestBinaryBody.size());

        // Wait for the request to complete
        postEventRequest.WaitForFinish();

        const HRESULT res = postEventRequest.GetResult();
        const DWORD status = postEventRequest.GetStatus();
        auto response = postEventRequest.GetData();
        reqContainer.responseString = std::string(response.begin(), response.end());

        if (FAILED(res))
        {
            reqContainer.errorWrapper.HttpCode = status != 0 ? status : 408;
            reqContainer.errorWrapper.HttpStatus = "Failed to contact server";
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorConnectionTimeout;
            reqContainer.errorWrapper.ErrorName = "Failed to contact server";
            reqContainer.errorWrapper.ErrorMessage = "Failed to contact server, curl error: " + std::to_string(res);
            HandleCallback(std::move(requestContainer));
        }
        else
        {
            if ((status >= 200 && status < 300) || status == 0)
            {
                // following One-DS recommendations, HTTP response codes within [200, 300) are success
                // (0 means HTTP code could not be determined and we attempt to parse response)
                Json::CharReaderBuilder jsonReaderFactory;
                std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
                JSONCPP_STRING jsonParseErrors;
                const bool parsedSuccessfully = jsonReader->parse(reqContainer.responseString.c_str(), reqContainer.responseString.c_str() + reqContainer.responseString.length(), &reqContainer.responseJson, &jsonParseErrors);

                if (parsedSuccessfully)
                {
                    auto result = reqContainer.responseJson.get("acc", Json::Value::null).asInt();
                    if (result > 0)
                    {
                        // fully successful response
                        reqContainer.errorWrapper.HttpCode = status != 0 ? status : 200;
                        reqContainer.errorWrapper.HttpStatus = "OK";
                        reqContainer.errorWrapper.Data = reqContainer.responseJson;
                        reqContainer.errorWrapper.ErrorName = "";
                        reqContainer.errorWrapper.ErrorMessage = "";
                    }
                    else
                    {
                        reqContainer.errorWrapper.HttpCode = status != 0 ? status : 200;
                        reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                        reqContainer.errorWrapper.Data = reqContainer.responseJson;
                        reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                        reqContainer.errorWrapper.ErrorName = "OneDS error";
                        reqContainer.errorWrapper.ErrorMessage = reqContainer.responseJson.toStyledString();
                    }
                }
                else
                {
                    reqContainer.errorWrapper.HttpCode = status != 0 ? status : 200;
                    reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                    reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                    reqContainer.errorWrapper.ErrorName = "Failed to parse OneDS response";
                    reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
                }
            }
            else if ((status >= 500 && status != 501 && status != 505)
                || status == 408 || status == 429)
            {
                // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
                // are eligible for retries

                // TODO implement a retry policy
                // As a placeholder, return an immediate error
                reqContainer.errorWrapper.HttpCode = status;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
                reqContainer.errorWrapper.ErrorName = "OneDSError";
                reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
            }
            else
            {
                // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
                reqContainer.errorWrapper.HttpCode = status;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
                reqContainer.errorWrapper.ErrorName = "OneDSError"; 
                reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
            }

            HandleCallback(std::move(requestContainer));
        }
    }
}

#endif