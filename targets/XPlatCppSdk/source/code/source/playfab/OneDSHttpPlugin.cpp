#include <stdafx.h>

#ifndef DISABLE_ONEDS_API

#include <playfab/OneDSHttpPlugin.h>

#include <curl/curl.h>

namespace PlayFab
{
    void OneDSHttpPlugin::ExecuteRequest(std::unique_ptr<CallRequestContainer> requestContainer)
    {
        OneDSCallRequestContainer& reqContainer = (OneDSCallRequestContainer&)*requestContainer;

        // Set up curl handle
        reqContainer.curlHandle = curl_easy_init();
        curl_easy_reset(reqContainer.curlHandle);
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_NOSIGNAL, true);
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_URL, "https://self.events.data.microsoft.com/OneCollector/1.0/");

        // Set up headers
        reqContainer.curlHttpHeaders = nullptr;
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Accept: */*");
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Client-Id: NO_AUTH");
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Content-Type: application/bond-compact-binary");
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Expect: 100-continue");
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "SDK-Version: EVT-PlayFab-XPlat-C++-No-3.0.275.1");
        int64_t now = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, (std::string("Upload-Time: ") + std::to_string(now)).c_str());
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, (std::string("Content-Length: ") + std::to_string(reqContainer.requestBinaryBody.size())).c_str());
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Connection: Keep-Alive");
        reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, "Cache-Control: no-cache");

        auto headers = reqContainer.GetHeaders();

        if (headers.size() > 0)
        {
            for (auto const &obj : headers)
            {
                if (obj.first.length() != 0 && obj.second.length() != 0) // no empty keys or values in headers
                {
                    std::string header = obj.first + ": " + obj.second;
                    reqContainer.curlHttpHeaders = curl_slist_append(reqContainer.curlHttpHeaders, header.c_str());
                }
            }
        }

        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_HTTPHEADER, reqContainer.curlHttpHeaders);

        // Set up post & payload
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_POST, nullptr);
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_POSTFIELDS, reqContainer.requestBinaryBody.data());
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_POSTFIELDSIZE, reqContainer.requestBinaryBody.size());

        // Process result
        // TODO: CURLOPT_ERRORBUFFER ?
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_TIMEOUT_MS, 10000L);
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_WRITEDATA, &reqContainer);
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_WRITEFUNCTION, CurlReceiveData);

        // Send
        curl_easy_setopt(reqContainer.curlHandle, CURLOPT_SSL_VERIFYPEER, false); // TODO: Replace this with a ca-bundle ref???
        const auto res = curl_easy_perform(reqContainer.curlHandle);

        if (res != CURLE_OK)
        {
            reqContainer.errorWrapper.HttpCode = 408;
            reqContainer.errorWrapper.HttpStatus = "Failed to contact server";
            reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorConnectionTimeout;
            reqContainer.errorWrapper.ErrorName = "Failed to contact server";
            reqContainer.errorWrapper.ErrorMessage = "Failed to contact server, curl error: " + std::to_string(res);
            HandleCallback(std::move(requestContainer));
        }
        else
        {
            Json::CharReaderBuilder jsonReaderFactory;
            std::unique_ptr<Json::CharReader> jsonReader(jsonReaderFactory.newCharReader());
            JSONCPP_STRING jsonParseErrors;
            const bool parsedSuccessfully = jsonReader->parse(reqContainer.responseString.c_str(), reqContainer.responseString.c_str() + reqContainer.responseString.length(), &reqContainer.responseJson, &jsonParseErrors);

            if (parsedSuccessfully)
            {
                auto result = reqContainer.responseJson.get("acc", Json::Value::null).asInt();
                if (result > 0)
                {
                    reqContainer.errorWrapper.HttpCode = 200;
                    reqContainer.errorWrapper.HttpStatus = "OK";
                    reqContainer.errorWrapper.Data = reqContainer.responseJson;
                    reqContainer.errorWrapper.ErrorName = "";
                    reqContainer.errorWrapper.ErrorMessage = "";
                    reqContainer.errorWrapper.ErrorDetails = "";
                }
                else
                {
                    reqContainer.errorWrapper.HttpCode = 400;
                    reqContainer.errorWrapper.HttpStatus = "Error";
                    reqContainer.errorWrapper.Data = reqContainer.responseJson;
                    reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorUnknownError;
                    reqContainer.errorWrapper.ErrorName = "OneDSError";
                    reqContainer.errorWrapper.ErrorMessage = reqContainer.responseJson.toStyledString();
                    reqContainer.errorWrapper.ErrorDetails = reqContainer.responseString;
                }
            }
            else
            {
                reqContainer.errorWrapper.HttpCode = 408;
                reqContainer.errorWrapper.HttpStatus = reqContainer.responseString;
                reqContainer.errorWrapper.ErrorCode = PlayFabErrorCode::PlayFabErrorConnectionTimeout;
                reqContainer.errorWrapper.ErrorName = "Failed to parse PlayFab response";
                reqContainer.errorWrapper.ErrorMessage = jsonParseErrors;
            }

            HandleCallback(std::move(requestContainer));
        }
    }
}

#endif