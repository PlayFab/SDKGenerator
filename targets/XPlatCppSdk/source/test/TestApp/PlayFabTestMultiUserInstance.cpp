// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <playfab/PlayFabClientInstanceApi.h>
#include <playfab/PlayFabSettings.h>
#include "TestContext.h"
#include "PlayFabTestMultiUserInstance.h"

using namespace PlayFab;
using namespace ClientModels;

namespace PlayFabUnit
{
    /// <summary>
    /// CLIENT API
    /// Try to log in two users simultaneously using instance APIs.
    /// </summary>
    void PlayFabTestMultiUserInstance::MultiUserLogin1Success(const LoginResult& result, void* customData)
    {
        GetPlayerProfileRequest profileRequest;
        profileRequest.authenticationContext = result.authenticationContext;

        auto user1ProfileSuccess = std::bind(&PlayFabTestMultiUserInstance::MultiUserProfile1Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user1ProfileFailure = std::bind(&PlayFabTestMultiUserInstance::MultiUserProfile1Failure, this, std::placeholders::_1, std::placeholders::_2);
        (*multiUser1ClientApi)->GetPlayerProfile(profileRequest, user1ProfileSuccess, user1ProfileFailure, customData);
    }
    void PlayFabTestMultiUserInstance::MultiUserLogin1Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to log in user 1: " + error.GenerateErrorReport());
    }
    void PlayFabTestMultiUserInstance::MultiUserProfile1Success(const GetPlayerProfileResult& result, void* /*customData*/)
    {
        multiUser1PlayFabId = result.PlayerProfile->PlayerId;
    }
    void PlayFabTestMultiUserInstance::MultiUserProfile1Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to get user 1 profile: " + error.GenerateErrorReport());
    }

    void PlayFabTestMultiUserInstance::MultiUserLogin2Success(const LoginResult& result, void* customData)
    {
        GetPlayerProfileRequest profileRequest;
        profileRequest.authenticationContext = result.authenticationContext;

        auto user2ProfileSuccess = std::bind(&PlayFabTestMultiUserInstance::MultiUserProfile2Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user2ProfileFailure = std::bind(&PlayFabTestMultiUserInstance::MultiUserProfile2Failure, this, std::placeholders::_1, std::placeholders::_2);
        (*multiUser2ClientApi)->GetPlayerProfile(profileRequest, user2ProfileSuccess, user2ProfileFailure, customData);
    }
    void PlayFabTestMultiUserInstance::MultiUserLogin2Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to log in user 2: " + error.GenerateErrorReport());
    }
    void PlayFabTestMultiUserInstance::MultiUserProfile2Success(const GetPlayerProfileResult& result, void* /*customData*/)
    {
        multiUser2PlayFabId = result.PlayerProfile->PlayerId;
    }
    void PlayFabTestMultiUserInstance::MultiUserProfile2Failure(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Failed to get user 2 profile: " + error.GenerateErrorReport());
    }

    void PlayFabTestMultiUserInstance::MultiUserLogin(TestContext& testContext)
    {
        // Step 1: Log in two Users simultaneously.
        LoginWithCustomIDRequest user1LoginRequest;
        user1LoginRequest.CustomId = "test_MultiInstance1";
        user1LoginRequest.CreateAccount = true;

        auto user1LoginSuccess = std::bind(&PlayFabTestMultiUserInstance::MultiUserLogin1Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user1LoginFailure = std::bind(&PlayFabTestMultiUserInstance::MultiUserLogin1Failure, this, std::placeholders::_1, std::placeholders::_2);
        (*multiUser1ClientApi)->LoginWithCustomID(user1LoginRequest, user1LoginSuccess, user1LoginFailure, &testContext);

        LoginWithCustomIDRequest user2LoginRequest;
        user2LoginRequest.CustomId = "test_MultiInstance2";
        user2LoginRequest.CreateAccount = true;

        auto user2LoginSuccess = std::bind(&PlayFabTestMultiUserInstance::MultiUserLogin2Success, this, std::placeholders::_1, std::placeholders::_2);
        auto user2LoginFailure = std::bind(&PlayFabTestMultiUserInstance::MultiUserLogin2Failure, this, std::placeholders::_1, std::placeholders::_2);
        (*multiUser2ClientApi)->LoginWithCustomID(user2LoginRequest, user2LoginSuccess, user2LoginFailure, &testContext);
    }

    void PlayFabTestMultiUserInstance::AddTests()
    {
        AddTest("MultiUserLoginInstance", &PlayFabTestMultiUserInstance::MultiUserLogin);
    }

    void PlayFabTestMultiUserInstance::ClassSetUp()
    {
        // Make sure PlayFab state is clean.
        PlayFabSettings::ForgetAllCredentials();

        // Create API handles for all users.
        multiUser1ClientApi = std::make_shared<PlayFabClientInstanceAPI*>(new PlayFabClientInstanceAPI());
        multiUser2ClientApi = std::make_shared<PlayFabClientInstanceAPI*>(new PlayFabClientInstanceAPI(std::make_shared<PlayFab::PlayFabApiSettings>())); // also test explicit API settings

        // Reset state variables.
        multiUser1PlayFabId = "";
        multiUser2PlayFabId = "";
    }

    void PlayFabTestMultiUserInstance::Tick(TestContext& testContext)
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

    void PlayFabTestMultiUserInstance::ClassTearDown()
    {
        // Clean up PlayFab state for next TestCase.
        PlayFabSettings::ForgetAllCredentials();

        // Release API handles for all users.
        multiUser1ClientApi = nullptr;
        multiUser2ClientApi = nullptr;
    }
}