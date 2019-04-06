#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSAndroidHttpPlugin.h>

namespace PlayFab
{
    constexpr auto ONEDS_SERVICE_URL = "https://self.events.data.microsoft.com/OneCollector/1.0/";

    std::string OneDSAndroidHttpPlugin::GetUrl(RequestTask& requestTask) const
    {
        return std::string(ONEDS_SERVICE_URL);
    }

    void OneDSAndroidHttpPlugin::SetPredefinedHeaders(RequestTask& requestTask)
    {
        OneDSCallRequestContainer& requestContainer = requestTask.OneDSRequestContainer();

        SetHeader(requestTask, "Accept", "*/*");
        SetHeader(requestTask, "Client-Id", "NO_AUTH");
        SetHeader(requestTask, "Content-Type", "application/bond-compact-binary");
        SetHeader(requestTask, "Expect", "100-continue");
        SetHeader(requestTask, "SDK-Version", "EVT-PlayFab-XPlat-C++-No-3.0.275.1");
        int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        SetHeader(requestTask, "Upload-Time", std::to_string(now).c_str());
        SetHeader(requestTask, "Content-Length: ", std::to_string(requestContainer.requestBinaryBody.size()).c_str());
        SetHeader(requestTask, "Connection", "Keep-Alive");
        SetHeader(requestTask, "Cache-Control", "no-cache");
    }

    bool OneDSAndroidHttpPlugin::GetBinaryPayload(RequestTask& requestTask, void*& payload, size_t& payloadSize) const
    {
        OneDSCallRequestContainer& requestContainer = requestTask.OneDSRequestContainer();
        payloadSize = static_cast<size_t>(requestContainer.requestBinaryBody.size());
        payload = requestContainer.requestBinaryBody.data();
        return true;
    }

    void OneDSAndroidHttpPlugin::ProcessResponse(RequestTask& requestTask, const int httpCode)
    {
        OneDSCallRequestContainer& requestContainer = requestTask.OneDSRequestContainer();
        if ((httpCode >= 200 && httpCode < 300) || httpCode == 0)
        {
            // following One-DS recommendations, HTTP response codes within [200, 300) are success
            // (0 means HTTP code could not be determined and we attempt to parse response)
            Json::CharReaderBuilder jsonReaderFactory;
            std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
            JSONCPP_STRING jsonParseErrors;
            const bool parsedSuccessfully = jsonReader->parse(requestContainer.responseString.c_str(), requestContainer.responseString.c_str() + requestContainer.responseString.length(), &requestContainer.responseJson, &jsonParseErrors);

            if (parsedSuccessfully)
            {
                auto result = requestContainer.responseJson.get("acc", Json::Value::null).asInt();
                if (result > 0)
                {
                    // fully successful response
                    requestContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                    requestContainer.errorWrapper.HttpStatus = "OK";
                    requestContainer.errorWrapper.Data = requestContainer.responseJson;
                    requestContainer.errorWrapper.ErrorName = "";
                    requestContainer.errorWrapper.ErrorMessage = "";
                }
                else
                {
                    requestContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                    requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
                    requestContainer.errorWrapper.Data = requestContainer.responseJson;
                    requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                    requestContainer.errorWrapper.ErrorName = "OneDS error";
                    requestContainer.errorWrapper.ErrorMessage = requestContainer.responseJson.toStyledString();
                }
            }
            else
            {
                requestContainer.errorWrapper.HttpCode = httpCode != 0 ? httpCode : 200;
                requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
                requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                requestContainer.errorWrapper.ErrorName = "Failed to parse OneDS response";
                requestContainer.errorWrapper.ErrorMessage = jsonParseErrors;
            }
        }
        else if ((httpCode >= 500 && httpCode != 501 && httpCode != 505)
                 || httpCode == 408 || httpCode == 429)
        {
            // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
            // are eligible for retries

            // TODO implement a retry policy
            // As a placeholder, return an immediate error
            requestContainer.errorWrapper.HttpCode = httpCode;
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
            requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
            requestContainer.errorWrapper.ErrorName = "OneDSError";
            requestContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
        }
        else
        {
            // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
            requestContainer.errorWrapper.HttpCode = httpCode;
            requestContainer.errorWrapper.HttpStatus = requestContainer.responseString;
            requestContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
            requestContainer.errorWrapper.ErrorName = "OneDSError";
            requestContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
        }
    }
}

#endif
