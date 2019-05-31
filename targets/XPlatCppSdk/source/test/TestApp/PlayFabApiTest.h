// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <functional>
#include <string>
#include "TestCase.h"

namespace PlayFab
{
    struct PlayFabError;

    namespace AuthenticationModels
    {
        struct GetEntityTokenResponse;
    }

    namespace ClientModels
    {
        struct ExecuteCloudScriptResult;
        struct GetAccountInfoResult;
        struct GetLeaderboardResult;
        struct GetPlayerStatisticsResult;
        struct GetUserDataResult;
        struct ListUsersCharactersResult;
        struct LoginResult;
        struct RegisterPlayFabUserResult;
        struct UpdatePlayerStatisticsResult;
        struct UpdateUserDataResult;
    }

    namespace DataModels
    {
        struct GetObjectsResponse;
        struct SetObjectsResponse;
    }
}

namespace PlayFabUnit
{
    struct TestTitleData;

    class PlayFabApiTest : public TestCase
    {
        private:
            // Fixed values provided from testInputs
            bool TITLE_INFO_SET;
            std::string USER_EMAIL;

            // Information fetched by appropriate API calls
            const static std::string TEST_DATA_KEY;
            const static std::string TEST_STAT_NAME;
            std::string playFabId;
            std::string entityId;
            std::string entityType;
            int testMessageInt;
            time_t testMessageTime;

            void OnErrorSharedCallback(const PlayFab::PlayFabError& error, void* customData);

            /// CLIENT API
            /// Try to deliberately cause a client-side validation error
            void InvalidSettings(TestContext& testContext);

            /// CLIENT API
            /// Try to deliberately log in with an inappropriate password,
            ///   and verify that the error displays as expected.
            void InvalidLogin(TestContext& testContext);
            void LoginCallback(const PlayFab::ClientModels::LoginResult&, void* customData);
            void LoginFailedCallback(const PlayFab::PlayFabError& error, void* customData);

            /// CLIENT API
            /// Test that a lambda error callback can be successfully invoked
            void InvalidLoginLambda(TestContext& testContext);

            /// CLIENT API
            /// Try to deliberately register a user with an invalid email and password
            ///   Verify that errorDetails are populated correctly.
            void InvalidRegistration(TestContext& testContext);
            void InvalidRegistrationSuccess(const PlayFab::ClientModels::RegisterPlayFabUserResult&, void* customData);
            void InvalidRegistrationFail(const PlayFab::PlayFabError& error, void* customData);

            /// CLIENT API
            /// Attempt a successful login
            void LoginOrRegister(TestContext& testContext);
            void OnLoginOrRegister(const PlayFab::ClientModels::LoginResult& result, void* customData);

            /// CLIENT API
            /// Test that the login call sequence sends the AdvertisingId when set
            void LoginWithAdvertisingId(TestContext& testContext);
            void OnLoginWithAdvertisingId(const PlayFab::ClientModels::LoginResult&, void* customData);

            /// CLIENT API
            /// Test a sequence of calls that modifies saved data,
            ///   and verifies that the next sequential API call contains updated data.
            /// Verify that the data is correctly modified on the next call.
            /// Parameter types tested: string, Dictionary<string, string>, DateTime
            void UserDataApi(TestContext& testContext);
            void OnUserDataApiGet1(const PlayFab::ClientModels::GetUserDataResult& result, void* customData);
            void OnUserDataApiUpdate(const PlayFab::ClientModels::UpdateUserDataResult&, void* customData);
            void OnUserDataApiGet2(const PlayFab::ClientModels::GetUserDataResult& result, void* customData);

            /// CLIENT API
            /// Test a sequence of calls that modifies saved data,
            ///   and verifies that the next sequential API call contains updated data.
            /// Verify that the data is saved correctly, and that specific types are tested
            /// Parameter types tested: Dictionary<string, int>
            void PlayerStatisticsApi(TestContext& testContext);
            void OnPlayerStatisticsApiGet1(const PlayFab::ClientModels::GetPlayerStatisticsResult& result, void* customData);
            void OnPlayerStatisticsApiUpdate(const PlayFab::ClientModels::UpdatePlayerStatisticsResult&, void* customData);
            void OnPlayerStatisticsApiGet2(const PlayFab::ClientModels::GetPlayerStatisticsResult& result, void* customData);

            /// CLIENT API
            /// Get or create the given test character for the given user
            /// Parameter types tested: Contained-Classes, string
            void UserCharacter(TestContext& testContext);
            void OnUserCharacter(const PlayFab::ClientModels::ListUsersCharactersResult&, void* customData);

            /// CLIENT API
            /// Test that leaderboard results can be requested
            /// Parameter types tested: List of contained-classes
            void LeaderBoard(TestContext& testContext);
            void OnClientLeaderBoard(const PlayFab::ClientModels::GetLeaderboardResult& result, void* customData);

            /// CLIENT API
            /// Test that AccountInfo can be requested
            /// Parameter types tested: List of enum-as-strings converted to list of enums
            void AccountInfo(TestContext& testContext);
            void OnAccountInfo(const PlayFab::ClientModels::GetAccountInfoResult& result, void* customData);

            /// CLIENT API
            /// Test that CloudScript can be properly set up and invoked
            void CloudScript(TestContext& testContext);
            void OnHelloWorldCloudScript(const PlayFab::ClientModels::ExecuteCloudScriptResult& result, void* customData);

            /// CLIENT API
            /// Test that a lambda success callback can be successfully invoked
            void CloudScriptLambda(TestContext& testContext);

            /// CLIENT API
            /// Test that CloudScript errors can be deciphered
            void CloudScriptError(TestContext& testContext);
            void OnCloudScriptError(const PlayFab::ClientModels::ExecuteCloudScriptResult& result, void* customData);

            /// CLIENT API
            /// Test that the client can publish custom PlayStream events
            void WriteEvent(TestContext& testContext);
            void OnWritePlayerEvent(const PlayFab::ClientModels::WriteEventResponse&, void* customData);

            /// ENTITY API
            /// Verify that a client login can be converted into an entity token
            void GetEntityToken(TestContext& testContext);
            void OnGetEntityToken(const PlayFab::AuthenticationModels::GetEntityTokenResponse& result, void* customData);

            /// ENTITY API
            /// Test a sequence of calls that modifies entity objects,
            ///   and verifies that the next sequential API call contains updated information.
            /// Verify that the object is correctly modified on the next call.
            void ObjectApi(TestContext& testContext);
            void OnGetObjects1(const PlayFab::DataModels::GetObjectsResponse& result, void* customData);
            void OnSetObjects(const PlayFab::DataModels::SetObjectsResponse&, void* customData);
            void OnGetObjects2(const PlayFab::DataModels::GetObjectsResponse& result, void* customData);

            // Utility
            template<typename T> std::function<void(const T&, void*)> Callback(void(PlayFabApiTest::*func)(const T&, void*))
            {
                return std::bind(func, this, std::placeholders::_1, std::placeholders::_2);
            }

        protected:
            void AddTests() override;

        public:
            void SetTitleInfo(TestTitleData& testInputs);

            void ClassSetUp() override;
            void SetUp(TestContext& /*testContext*/) override;
            void Tick(TestContext& testContext) override;
            void ClassTearDown() override;
    };
}