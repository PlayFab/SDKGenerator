#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSWinHttpPlugin.h>
#include <windows.h>
#include <winhttp.h>

#pragma warning (disable: 4100) // formal parameters are part of a public interface
#pragma warning (disable: 4245) // Some DWORD arguments of WinHTTP API can accept -1, according to documentation

namespace PlayFab
{
    constexpr auto ONEDS_SERVICE_URL = "https://self.events.data.microsoft.com/OneCollector/1.0/";

    std::string OneDSWinHttpPlugin::GetUrl(CallRequestContainer& requestContainer) const
    {
        return std::string(ONEDS_SERVICE_URL);
    }

    void OneDSWinHttpPlugin::SetPredefinedHeaders(CallRequestContainer& requestContainer, HINTERNET hRequest)
    {
        OneDSCallRequestContainer& reqContainer = (OneDSCallRequestContainer&)requestContainer;

        WinHttpAddRequestHeaders(hRequest, L"Accept: */*", -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"Client-Id: NO_AUTH", -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"Content-Type: application/bond-compact-binary", -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"Expect: 100-continue", -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"SDK-Version: EVT-PlayFab-XPlat-C++-No-3.0.275.1", -1, 0);
        int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        WinHttpAddRequestHeaders(hRequest, (L"Upload-Time: " + std::to_wstring(now)).c_str(), -1, 0);
        WinHttpAddRequestHeaders(hRequest, (L"Content-Length: " + std::to_wstring(reqContainer.requestBinaryBody.size())).c_str(), -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"Connection: Keep-Alive", -1, 0);
        WinHttpAddRequestHeaders(hRequest, L"Cache-Control: no-cache", -1, 0);
    }

    bool OneDSWinHttpPlugin::GetBinaryPayload(CallRequestContainer& requestContainer, LPVOID& payload, DWORD& payloadSize) const
    {
        OneDSCallRequestContainer& reqContainer = (OneDSCallRequestContainer&)requestContainer;
        payloadSize = static_cast<DWORD>(reqContainer.requestBinaryBody.size());
        payload = reqContainer.requestBinaryBody.data();
        return true;
    }

    void OneDSWinHttpPlugin::ProcessResponse(CallRequestContainer& reqContainer, const int httpCode)
    {
        if ((httpCode >= 200 && httpCode < 300) || httpCode == 0)
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
                    reqContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                    reqContainer.errorWrapper.HttpStatus = "OK";
                    reqContainer.errorWrapper.Data = reqContainer.responseJson;
                    reqContainer.errorWrapper.ErrorName = "";
                    reqContainer.errorWrapper.ErrorMessage = "";
                }
                else
                {
                    reqContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                    reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                    reqContainer.errorWrapper.Data = reqContainer.responseJson;
                    reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                    reqContainer.errorWrapper.ErrorName = "OneDS error";
                    reqContainer.errorWrapper.ErrorMessage = reqContainer.responseJson.toStyledString();
                }
            }
            else
            {
                reqContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                reqContainer.errorWrapper.ErrorName = "Failed to parse OneDS response";
                reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
            }
        }
        else if ((httpCode >= 500 && httpCode != 501 && httpCode != 505)
            || httpCode == 408 || httpCode == 429)
        {
            // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
            // are eligible for retries

            // TODO implement a retry policy
            // As a placeholder, return an immediate error
            reqContainer.errorWrapper.HttpCode = httpCode;
            reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
            reqContainer.errorWrapper.ErrorName = "OneDSError";
            reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
        }
        else
        {
            // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
            reqContainer.errorWrapper.HttpCode = httpCode;
            reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
            reqContainer.errorWrapper.ErrorName = "OneDSError";
            reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
        }
    }
}

#endif