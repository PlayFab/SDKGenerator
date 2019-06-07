// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <memory>
#include <string>
#include "TestDataTypes.h"

namespace PlayFab
{
    struct PlayFabError;

    namespace ClientModels
    {
        struct ExecuteCloudScriptResult;
        struct LoginResult;
    }
}

namespace PlayFabUnit
{
    class TestApp
    {
        public:
            int Main();

        private:
            // Cloud Report
            std::string cloudResponse = "";
            std::string cloudPlayFabId = "";
            void OnPostReportLogin(const PlayFab::ClientModels::LoginResult& result, void* customData);
            void OnPostReportComplete(const PlayFab::ClientModels::ExecuteCloudScriptResult& result, void* /*customData*/);
            void OnPostReportError(const PlayFab::PlayFabError& error, void* /*customData*/);

            // Utility
            static bool LoadTitleData(TestTitleData& titleData);
            static void Log(const char* format, ...);

            // Partial class methods
            // Each platform gets its own file and implementation of the following methods, since the logic
            // is likely to be very different on all of them.
            static bool LoadTitleDataJson(std::shared_ptr<char*>& testDataJsonPtr, size_t& testDataJsonLen);
            static void LogPut(const char* message);
    };
}