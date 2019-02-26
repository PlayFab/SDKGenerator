// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabSettings.h>
#include "TestContext.h"
#include "PlayFabTestMultiUserStatic.h"

using namespace PlayFab;
using namespace ClientModels;

namespace PlayFabUnit
{
    /// <summary>
    /// CLIENT API
    /// Try to log in two users simultaneously using static APIs.
    /// </summary>
    void PlayFabTestMultiUserStatic::MultiUserLogin1Success(const LoginResult& result, void* customData)
    {
        GetPlayerProfileRequest profileRequest;
        profileRequest.authenticationContext = result.authenticationContext;

        auto user1ProfileSuccess = std::bind(&PlayFabTestMultiUserStatic::MultiUserProfile1Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user1ProfileFailure = std::bind(&PlayFabTestMultiUserStatic::MultiUserProfile1Failure, this, std::placeholders::_1, std::placeholders::_2);
        PlayFabClientAPI::GetPlayerProfile(profileRequest, user1ProfileSuccess, user1ProfileFailure, customData);
    }
    void PlayFabTestMultiUserStatic::MultiUserLogin1Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to log in user 1: " + error.GenerateErrorReport());
    }
    void PlayFabTestMultiUserStatic::MultiUserProfile1Success(const GetPlayerProfileResult& result, void* /*customData*/)
    {
        multiUser1PlayFabId = result.PlayerProfile->PlayerId;
    }
    void PlayFabTestMultiUserStatic::MultiUserProfile1Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to get user 1 profile: " + error.GenerateErrorReport());
    }

    void PlayFabTestMultiUserStatic::MultiUserLogin2Success(const LoginResult& result, void* customData)
    {
        GetPlayerProfileRequest profileRequest;
        profileRequest.authenticationContext = result.authenticationContext;

        auto user2ProfileSuccess = std::bind(&PlayFabTestMultiUserStatic::MultiUserProfile2Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user2ProfileFailure = std::bind(&PlayFabTestMultiUserStatic::MultiUserProfile2Failure, this, std::placeholders::_1, std::placeholders::_2);
        PlayFabClientAPI::GetPlayerProfile(profileRequest, user2ProfileSuccess, user2ProfileFailure, customData);
    }
    void PlayFabTestMultiUserStatic::MultiUserLogin2Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to log in user 2: " + error.GenerateErrorReport());
    }
    void PlayFabTestMultiUserStatic::MultiUserProfile2Success(const GetPlayerProfileResult& result, void* /*customData*/)
    {
        multiUser2PlayFabId = result.PlayerProfile->PlayerId;
    }
    void PlayFabTestMultiUserStatic::MultiUserProfile2Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to get user 2 profile: " + error.GenerateErrorReport());
    }

    void PlayFabTestMultiUserStatic::MultiUserLogin(TestContext& testContext)
    {
        // Step 1: Log in two Users simultaneously.
        LoginWithCustomIDRequest user1LoginRequest;
        user1LoginRequest.CustomId = "test_MultiStatic1";
        user1LoginRequest.CreateAccount = true;

        auto user1LoginSuccess = std::bind(&PlayFabTestMultiUserStatic::MultiUserLogin1Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user1LoginFailure = std::bind(&PlayFabTestMultiUserStatic::MultiUserLogin1Failure, this, std::placeholders::_1, std::placeholders::_2);
        PlayFabClientAPI::LoginWithCustomID(user1LoginRequest, user1LoginSuccess, user1LoginFailure, &testContext);

        LoginWithCustomIDRequest user2LoginRequest;
        user2LoginRequest.CustomId = "test_MultiStatic2";
        user2LoginRequest.CreateAccount = true;

        auto user2LoginSuccess = std::bind(&PlayFabTestMultiUserStatic::MultiUserLogin2Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user2LoginFailure = std::bind(&PlayFabTestMultiUserStatic::MultiUserLogin2Failure, this, std::placeholders::_1, std::placeholders::_2);
        PlayFabClientAPI::LoginWithCustomID(user2LoginRequest, user2LoginSuccess, user2LoginFailure, &testContext);
    }

    void PlayFabTestMultiUserStatic::AddTests()
    {
        AddTest("MultiUserLoginStatic", &PlayFabTestMultiUserStatic::MultiUserLogin);
    }

    void PlayFabTestMultiUserStatic::ClassSetUp()
    {
        // Make sure PlayFab state is clean.
        PlayFabSettings::ForgetAllCredentials();

        // Reset state variables.
        multiUser1PlayFabId = "";
        multiUser2PlayFabId = "";
    }

    void PlayFabTestMultiUserStatic::Tick(TestContext& testContext)
    {
        // Wait for both users to become logged in.
        if (multiUser1PlayFabId.empty() || multiUser2PlayFabId.empty())
            return;

        // Once retreived, each user should have a unique ID.
        if (multiUser1PlayFabId == multiUser2PlayFabId)
            testContext.Fail("User 1 PlayFabId (" + multiUser1PlayFabId + ") should not match User 2 PlayFabId (" + multiUser2PlayFabId + ")");
        else
            testContext.Pass();
    }

    void PlayFabTestMultiUserStatic::ClassTearDown()
    {
        // Clean up any PlayFab state for next TestCase.
        PlayFabSettings::ForgetAllCredentials();
    }
}
