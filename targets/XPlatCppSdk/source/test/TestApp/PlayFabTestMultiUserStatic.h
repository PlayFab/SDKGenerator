// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include "TestCase.h"

namespace PlayFab
{
    namespace ClientModels
    {
        struct GetPlayerProfileResult;
        struct LoginResult;
    }

    struct PlayFabError;
}

namespace PlayFabUnit
{
    class PlayFabTestMultiUserStatic : public TestCase
    {
        private:
            /// <summary>
            /// CLIENT API
            /// Try to log in two users simultaneously using static APIs.
            /// </summary>
            std::string multiUser1PlayFabId;
            std::string multiUser2PlayFabId;

            void MultiUserLogin1Success(const PlayFab::ClientModels::LoginResult& result, void* customData);
            void MultiUserLogin1Failure(const PlayFab::PlayFabError& error, void* customData);
            void MultiUserProfile1Success(const PlayFab::ClientModels::GetPlayerProfileResult& result, void* customData);
            void MultiUserProfile1Failure(const PlayFab::PlayFabError& error, void* customData);
            void MultiUserLogin2Success(const PlayFab::ClientModels::LoginResult& result, void* customData);
            void MultiUserLogin2Failure(const PlayFab::PlayFabError& error, void* customData);
            void MultiUserProfile2Success(const PlayFab::ClientModels::GetPlayerProfileResult& result, void* customData);
            void MultiUserProfile2Failure(const PlayFab::PlayFabError& error, void* customData);
            void MultiUserLogin(TestContext& testContext);

        protected:
            void AddTests() override;

        public:
            void ClassSetUp() override;
            void Tick(TestContext& testContext) override;
            void ClassTearDown() override;
    };
}