#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSCurlHttpPlugin.h>
#include <curl/curl.h>

namespace PlayFab
{
    void OneDSCurlHttpPlugin::ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        OneDSCallRequestContainer& reqContainer = (OneDSCallRequestContainer&)*requestContainer;

        // Set up curl handle
        CURL* curlHandle = curl_easy_init();
        curl_easy_reset(curlHandle);
        curl_easy_setopt(curlHandle, CURLOPT_NOSIGNAL, true);
        curl_easy_setopt(curlHandle, CURLOPT_URL, "https://self.events.data.microsoft.com/OneCollector/1.0/");

        // Set up headers
        curl_slist* curlHttpHeaders = nullptr;
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Accept: */*");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Client-Id: NO_AUTH");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Content-Type: application/bond-compact-binary");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Expect: 100-continue");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "SDK-Version: EVT-PlayFab-XPlat-C++-No-3.0.275.1");
        int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, (std::string("Upload-Time: ") + std::to_string(now)).c_str());
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, (std::string("Content-Length: ") + std::to_string(reqContainer.requestBinaryBody.size())).c_str());
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Connection: Keep-Alive");
        curlHttpHeaders = curl_slist_append(curlHttpHeaders, "Cache-Control: no-cache");

        auto headers = reqContainer.GetHeaders();

        if (headers.size() > 0)
        {
            for (auto const &obj : headers)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    std::string header = obj.first + ": " + obj.second;
                    curlHttpHeaders = curl_slist_append(curlHttpHeaders, header.c_str());
                }
            }
        }

        curl_easy_setopt(curlHandle, CURLOPT_HTTPHEADER, curlHttpHeaders);

        // Set up post & payload
        curl_easy_setopt(curlHandle, CURLOPT_POST, nullptr);
        curl_easy_setopt(curlHandle, CURLOPT_POSTFIELDS, reqContainer.requestBinaryBody.data());
        curl_easy_setopt(curlHandle, CURLOPT_POSTFIELDSIZE, reqContainer.requestBinaryBody.size());

        // Process result
        // TODO: CURLOPT_ERRORBUFFER ?
        curl_easy_setopt(curlHandle, CURLOPT_TIMEOUT_MS, 10000L);
        curl_easy_setopt(curlHandle, CURLOPT_WRITEDATA, &reqContainer);
        curl_easy_setopt(curlHandle, CURLOPT_WRITEFUNCTION, CurlReceiveData);

        // Send
        curl_easy_setopt(curlHandle, CURLOPT_SSL_VERIFYPEER, false); // TODO: Replace this with a ca-bundle ref???
        const auto res = curl_easy_perform(curlHandle);
        long curlHttpResponseCode = 0;
        curl_easy_getinfo(curlHandle, CURLINFO_RESPONSE_CODE, &curlHttpResponseCode);

        if (res != CURLE_OK)
        {
            reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 408;
            reqContainer.errorWrapper.HttpStatus = "Failed to contact server";
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorConnectionTimeout;
            reqContainer.errorWrapper.ErrorName = "Failed to contact server";
            reqContainer.errorWrapper.ErrorMessage = "Failed to contact server, curl error: " + std::to_string(res);
            HandleCallback(std::move(requestContainer));
        }
        else
        {
            if ((curlHttpResponseCode >= 200 && curlHttpResponseCode < 300) || curlHttpResponseCode == 0)
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
                        reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 200;
                        reqContainer.errorWrapper.HttpStatus = "OK";
                        reqContainer.errorWrapper.Data = reqContainer.responseJson;
                        reqContainer.errorWrapper.ErrorName = "";
                        reqContainer.errorWrapper.ErrorMessage = "";
                    }
                    else
                    {
                        reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 200;
                        reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                        reqContainer.errorWrapper.Data = reqContainer.responseJson;
                        reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                        reqContainer.errorWrapper.ErrorName = "OneDS error";
                        reqContainer.errorWrapper.ErrorMessage = reqContainer.responseJson.toStyledString();
                    }
                }
                else
                {
                    reqContainer.errorWrapper.HttpCode = curlHttpResponseCode != 0 ? curlHttpResponseCode : 200;
                    reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                    reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorPartialFailure;
                    reqContainer.errorWrapper.ErrorName = "Failed to parse OneDS response";
                    reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
                }
            }
            else if ((curlHttpResponseCode >= 500 && curlHttpResponseCode != 501 && curlHttpResponseCode != 505)
                || curlHttpResponseCode == 408 || curlHttpResponseCode == 429)
            {
                // following One-DS recommendations, HTTP response codes in this range (excluding and including specific codes)
                // are eligible for retries

                // TODO implement a retry policy
                // As a placeholder, return an immediate error
                reqContainer.errorWrapper.HttpCode = curlHttpResponseCode;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
                reqContainer.errorWrapper.ErrorName = "OneDSError";
                reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
            }
            else
            {
                // following One-DS recommendations, all other HTTP response codes are errors that should not be retried
                reqContainer.errorWrapper.HttpCode = curlHttpResponseCode;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
                reqContainer.errorWrapper.ErrorName = "OneDSError";
                reqContainer.errorWrapper.ErrorMessage = "Failed to send a batch of events to OneDS";
            }

            HandleCallback(std::move(requestContainer));
        }

        curl_slist_free_all(curlHttpHeaders);
        curlHttpHeaders = nullptr;
        curl_easy_cleanup(curlHandle);
    }
}

#endif
