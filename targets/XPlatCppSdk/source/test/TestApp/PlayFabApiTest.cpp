// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <string>
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/PlayFabAuthenticationDataModels.h>
#include <playfab/PlayFabAuthenticationAPI.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabDataDataModels.h>
#include <playfab/PlayFabDataAPI.h>
#include "PlayFabApiTest.h"
#include "TestContext.h"

using namespace PlayFab;
using namespace ClientModels;
using namespace AuthenticationModels;
using namespace DataModels;

namespace PlayFabUnit
{
    const std::string PlayFabApiTest::TEST_DATA_KEY = "testCounter";
    const std::string PlayFabApiTest::TEST_STAT_NAME = "str";

    void PlayFabApiTest::SetTitleInfo(TestTitleData& testInputs)
    {
        PlayFabSettings::titleId = testInputs.titleId;
        USER_EMAIL = testInputs.userEmail;

        // Verify all the inputs won't cause crashes in the tests
        TITLE_INFO_SET = !PlayFabSettings::titleId.empty() && !USER_EMAIL.empty();
    }

    void PlayFabApiTest::OnErrorSharedCallback(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Unexpected error: " + error.ErrorMessage);
    }

    /// CLIENT API
    /// Try to deliberately log in with an inappropriate password,
    ///   and verify that the error displays as expected.
    void PlayFabApiTest::InvalidLogin(TestContext& testContext)
    {
        LoginWithEmailAddressRequest request;
        request.Email = USER_EMAIL;
        request.Password = "INVALID";

        PlayFabClientAPI::LoginWithEmailAddress(request,
            Callback(&PlayFabApiTest::LoginCallback),
            Callback(&PlayFabApiTest::LoginFailedCallback),
            &testContext);
    }
    void PlayFabApiTest::LoginCallback(const LoginResult&, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Expected login to fail");
    }
    void PlayFabApiTest::LoginFailedCallback(const PlayFabError& error, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        if (error.ErrorMessage.find("password") != -1)
            testContext->Pass();
        else
            testContext->Fail("Password error message not found: " + error.ErrorMessage);
    }

    /// CLIENT API
    /// Test that a lambda error callback can be successfully invoked
    void PlayFabApiTest::InvalidLoginLambda(TestContext& testContext)
    {
        LoginWithEmailAddressRequest request;
        request.Email = USER_EMAIL;
        request.Password = "INVALID";

        PlayFabClientAPI::LoginWithEmailAddress(request,
            nullptr,
            [](const PlayFabError& error, void* customData) { TestContext* testContext = reinterpret_cast<TestContext*>(customData); if (error.ErrorMessage.find("password") != -1) testContext->Pass(); },
            &testContext);
    }

    /// CLIENT API
    /// Try to deliberately register a user with an invalid email and password
    ///   Verify that errorDetails are populated correctly.
    void PlayFabApiTest::InvalidRegistration(TestContext& testContext)
    {
        RegisterPlayFabUserRequest request;
        request.Username = "x";
        request.Email = "x";
        request.Password = "x";

        PlayFabClientAPI::RegisterPlayFabUser(request,
            Callback(&PlayFabApiTest::InvalidRegistrationSuccess),
            Callback(&PlayFabApiTest::InvalidRegistrationFail),
            &testContext);
    }
    void PlayFabApiTest::InvalidRegistrationSuccess(const RegisterPlayFabUserResult&, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Fail("Expected registration to fail");
    }
    void PlayFabApiTest::InvalidRegistrationFail(const PlayFabError& error, void* customData)
    {
        bool foundEmailMsg, foundPasswordMsg;
        std::string expectedEmailMsg = "Email address is not valid.";
        std::string expectedPasswordMsg = "Password must be between";
        std::string errorReport = error.GenerateErrorReport();

        foundEmailMsg = (errorReport.find(expectedEmailMsg) != -1);
        foundPasswordMsg = (errorReport.find(expectedPasswordMsg) != -1);

        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        if (foundEmailMsg && foundPasswordMsg)
            testContext->Pass();
        else
            testContext->Fail("All error details: " + errorReport);
    }

    /// CLIENT API
    /// Attempt a successful login
    void PlayFabApiTest::LoginOrRegister(TestContext& testContext)
    {
        LoginWithCustomIDRequest request;
        request.CustomId = PlayFabSettings::buildIdentifier;
        request.CreateAccount = true;

        PlayFabClientAPI::LoginWithCustomID(request,
            Callback(&PlayFabApiTest::OnLoginOrRegister),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnLoginOrRegister(const LoginResult& result, void* customData)
    {
        playFabId = result.PlayFabId;
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }

    /// CLIENT API
    /// Test that the login call sequence sends the AdvertisingId when set
    void PlayFabApiTest::LoginWithAdvertisingId(TestContext& testContext)
    {
        PlayFabSettings::advertisingIdType = PlayFabSettings::AD_TYPE_ANDROID_ID;
        PlayFabSettings::advertisingIdValue = "PlayFabTestId";

        LoginWithCustomIDRequest request;
        request.CustomId = PlayFabSettings::buildIdentifier;
        request.CreateAccount = true;

        PlayFabClientAPI::LoginWithCustomID(request,
            Callback(&PlayFabApiTest::OnLoginWithAdvertisingId),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnLoginWithAdvertisingId(const LoginResult&, void* customData)
    {
        // TODO: Need to wait for the NEXT api call to complete, and then test PlayFabSettings::advertisingIdType
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }

    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is correctly modified on the next call.
    /// Parameter types tested: string, Dictionary<string, string>, DateTime
    void PlayFabApiTest::UserDataApi(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        GetUserDataRequest request;
        PlayFabClientAPI::GetUserData(request,
            Callback(&PlayFabApiTest::OnUserDataApiGet1),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnUserDataApiGet1(const GetUserDataResult& result, void* customData)
    {
        auto it = result.Data.find(TEST_DATA_KEY);
        testMessageInt = (it == result.Data.end()) ? 1 : atoi(it->second.Value.c_str());
        // testMessageTime = it->second.LastUpdated; // Don't need the first time

        testMessageInt = (testMessageInt + 1) % 100;
        UpdateUserDataRequest updateRequest;

        // itoa is not avaialable in android
        char buffer[16];
        std::string temp;
#ifdef PLAYFAB_PLATFORM_IOS
        sprintf(buffer, "%d", testMessageInt);
#else // PLAYFAB_PLATFORM_IOS
        sprintf_s(buffer, "%d", testMessageInt);
#endif // PLAYFAB_PLATFORM_IOS
        temp.append(buffer);

        updateRequest.Data[TEST_DATA_KEY] = temp;
        PlayFabClientAPI::UpdateUserData(updateRequest,
            Callback(&PlayFabApiTest::OnUserDataApiUpdate),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnUserDataApiUpdate(const UpdateUserDataResult&, void* customData)
    {
        GetUserDataRequest request;
        PlayFabClientAPI::GetUserData(request,
            Callback(&PlayFabApiTest::OnUserDataApiGet2),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnUserDataApiGet2(const GetUserDataResult& result, void* customData)
    {
        auto it = result.Data.find(TEST_DATA_KEY);
        int actualDataValue = (it == result.Data.end()) ? -1 : atoi(it->second.Value.c_str());
        testMessageTime = (it == result.Data.end()) ? 0 : it->second.LastUpdated;

        time_t now = time(nullptr);
        struct tm timeinfo;
#ifdef PLAYFAB_PLATFORM_IOS
        timeinfo = *gmtime(&now);
#else // PLAYFAB_PLATFORM_IOS
        gmtime_s(&timeinfo, &now);
#endif // PLAYFAB_PLATFORM_IOS
        now = mktime(&timeinfo);
        time_t minTime = now - (60 * 5);
        time_t maxTime = now + (60 * 5);

        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        if (it == result.Data.end())
            testContext->Fail("Expected user data not found.");
        else if (testMessageInt != actualDataValue)
            testContext->Fail("User data not updated as expected.");
        else if (!(minTime <= testMessageTime && testMessageTime <= maxTime))
            testContext->Fail("DateTime not parsed correctly..");
        else
            testContext->Pass();
    }

    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is saved correctly, and that specific types are tested
    /// Parameter types tested: Dictionary<string, int>
    void PlayFabApiTest::PlayerStatisticsApi(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        GetPlayerStatisticsRequest request;
        PlayFabClientAPI::GetPlayerStatistics(request,
            Callback(&PlayFabApiTest::OnPlayerStatisticsApiGet1),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnPlayerStatisticsApiGet1(const GetPlayerStatisticsResult& result, void* customData)
    {
        testMessageInt = 0;
        for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
            if (it->StatisticName == TEST_STAT_NAME)
                testMessageInt = it->Value;
        testMessageInt = (testMessageInt + 1) % 100;
        // testMessageTime = it->second.LastUpdated; // Don't need the first time

        UpdatePlayerStatisticsRequest updateRequest;
        StatisticUpdate updateStat;
        updateStat.StatisticName = TEST_STAT_NAME;
        updateStat.Value = testMessageInt;
        updateRequest.Statistics.insert(updateRequest.Statistics.end(), updateStat);

        PlayFabClientAPI::UpdatePlayerStatistics(updateRequest,
            Callback(&PlayFabApiTest::OnPlayerStatisticsApiUpdate),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnPlayerStatisticsApiUpdate(const UpdatePlayerStatisticsResult&, void* customData)
    {
        GetPlayerStatisticsRequest request;
        PlayFabClientAPI::GetPlayerStatistics(request,
            Callback(&PlayFabApiTest::OnPlayerStatisticsApiGet2),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnPlayerStatisticsApiGet2(const GetPlayerStatisticsResult& result, void* customData)
    {
        int actualStatValue = -1000; // A value that is never expected to appear
        for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
            if (it->StatisticName == TEST_STAT_NAME)
                actualStatValue = it->Value;

        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        if (actualStatValue == -1000)
            testContext->Fail("Expected user statistic not found.");
        else if (testMessageInt != actualStatValue)
            testContext->Fail("User statistic not updated as expected.");
        else
            testContext->Pass();
    }

    /// CLIENT API
    /// Get or create the given test character for the given user
    /// Parameter types tested: Contained-Classes, string
    void PlayFabApiTest::UserCharacter(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        ListUsersCharactersRequest request;
        PlayFabClientAPI::GetAllUsersCharacters(request,
            Callback(&PlayFabApiTest::OnUserCharacter),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnUserCharacter(const ListUsersCharactersResult&, void* customData)
    {
        // We aren't adding a character to this account, so there's nothing really to test here
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }
    
    /// CLIENT API
    /// Test that leaderboard results can be requested
    /// Parameter types tested: List of contained-classes
    void PlayFabApiTest::LeaderBoard(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        testMessageInt = 0;
        GetLeaderboardRequest clientRequest;
        clientRequest.MaxResultsCount = 3;
        clientRequest.StatisticName = TEST_STAT_NAME;

        PlayFabClientAPI::GetLeaderboard(clientRequest,
            Callback(&PlayFabApiTest::OnClientLeaderBoard),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnClientLeaderBoard(const GetLeaderboardResult& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        if (result.Leaderboard.size() > 0) // We added too many users and stats to test for a specific user, so we just have to test for "any number of results" now
            testContext->Pass();
        else
            testContext->Fail("Leaderboard entry not found.");
    }

    /// CLIENT API
    /// Test that AccountInfo can be requested
    /// Parameter types tested: List of enum-as-strings converted to list of enums
    void PlayFabApiTest::AccountInfo(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        GetAccountInfoRequest request;
        PlayFabClientAPI::GetAccountInfo(request,
            Callback(&PlayFabApiTest::OnAccountInfo),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnAccountInfo(const GetAccountInfoResult& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        // Enums-by-name can't really be tested in C++, the way they can in other languages
        if (result.AccountInfo.isNull() || result.AccountInfo->TitleInfo.isNull() || result.AccountInfo->TitleInfo->Origination.isNull())
            testContext->Fail("The Origination data is not present");
        else // Received data-format as expected
            testContext->Pass();
    }

    /// CLIENT API
    /// Test that CloudScript can be properly set up and invoked
    void PlayFabApiTest::CloudScript(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        ExecuteCloudScriptRequest request;
        request.FunctionName = "helloWorld";

        PlayFabClientAPI::ExecuteCloudScript(request,
            Callback(&PlayFabApiTest::OnHelloWorldCloudScript),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnHelloWorldCloudScript(const ExecuteCloudScriptResult& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        std::string cloudScriptLogReport = "";
        if (result.Error.notNull())
            cloudScriptLogReport = result.Error->Error + ": " + result.Error->Message;
        for (auto it = result.Logs.begin(); it != result.Logs.end(); ++it)
            cloudScriptLogReport += "\n" + (*it).Message;

        bool success = (cloudScriptLogReport.find("Hello " + playFabId + "!") != -1);
        if (!success)
            testContext->Fail(cloudScriptLogReport);
        else
            testContext->Pass();
    }

    /// CLIENT API
    /// Test that a lambda success callback can be successfully invoked
    void PlayFabApiTest::CloudScriptLambda(TestContext& testContext)
    {
        ExecuteCloudScriptRequest hwRequest;
        hwRequest.FunctionName = "helloWorld";

        PlayFabClientAPI::ExecuteCloudScript(hwRequest,
            [&](const ExecuteCloudScriptResult& constResult, void* customData) { OnHelloWorldCloudScript(constResult, customData); },
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }

    /// CLIENT API
    /// Test that CloudScript errors can be deciphered
    void PlayFabApiTest::CloudScriptError(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        ExecuteCloudScriptRequest request;
        request.FunctionName = "throwError";

        PlayFabClientAPI::ExecuteCloudScript(request,
            Callback(&PlayFabApiTest::OnCloudScriptError),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnCloudScriptError(const ExecuteCloudScriptResult& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        bool success = true;
        success &= result.FunctionResult.isNull();
        success &= result.Error.notNull();
        success &= result.Error->Error.compare("JavascriptException") == 0;
        if (!success)
            testContext->Fail("Expected Cloud Script error was not present.");
        else
            testContext->Pass();
    }

    /// CLIENT API
    /// Test that the client can publish custom PlayStream events
    void PlayFabApiTest::WriteEvent(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        WriteClientPlayerEventRequest request;
        request.EventName = "ForumPostEvent";
        request.Timestamp = time(nullptr);
        request.Body["Subject"] = "My First Post";
        request.Body["Body"] = "My mega-sweet body text for my first post!";

        PlayFabClientAPI::WritePlayerEvent(request,
            Callback(&PlayFabApiTest::OnWritePlayerEvent),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnWritePlayerEvent(const WriteEventResponse&, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);
        testContext->Pass();
    }

    /// ENTITY API
    /// Verify that a client login can be converted into an entity token
    void PlayFabApiTest::GetEntityToken(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        GetEntityTokenRequest request;
        PlayFabAuthenticationAPI::GetEntityToken(request,
            Callback(&PlayFabApiTest::OnGetEntityToken),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnGetEntityToken(const GetEntityTokenResponse& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);

        entityId = result.Entity->Id;
        entityType = result.Entity->Type;

        if (entityType != "title_player_account")
            testContext->Fail("entityType unexpected: " + entityType);
        else if (entityId.length() == 0)
            testContext->Fail("EntityID was empty");
        else
            testContext->Pass();
    }

    /// ENTITY API
    /// Test a sequence of calls that modifies entity objects,
    ///   and verifies that the next sequential API call contains updated information.
    /// Verify that the object is correctly modified on the next call.
    void PlayFabApiTest::ObjectApi(TestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            testContext.Skip("Earlier tests failed to log in");
            return;
        }

        GetObjectsRequest request;
        request.Entity.Id = entityId;
        request.Entity.Type = entityType;
        request.EscapeObject = true;
        PlayFabDataAPI::GetObjects(request,
            Callback(&PlayFabApiTest::OnGetObjects1),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            &testContext);
    }
    void PlayFabApiTest::OnGetObjects1(const GetObjectsResponse& result, void* customData)
    {
        testMessageInt = 0;
        auto found = result.Objects.find(TEST_DATA_KEY);
        if (found != result.Objects.end())
            testMessageInt = atoi(found->second.EscapedDataObject.c_str());
        testMessageInt = (testMessageInt + 1) % 100;

        SetObjectsRequest request;
        request.Entity.Id = entityId;
        request.Entity.Type = entityType;

        SetObject updateObj;
        updateObj.ObjectName = TEST_DATA_KEY;
        updateObj.DataObject = testMessageInt;
        request.Objects.push_back(updateObj);

        PlayFabDataAPI::SetObjects(request,
            Callback(&PlayFabApiTest::OnSetObjects),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnSetObjects(const SetObjectsResponse&, void* customData)
    {
        GetObjectsRequest request;
        request.Entity.Id = entityId;
        request.Entity.Type = entityType;
        request.EscapeObject = true;

        PlayFabDataAPI::GetObjects(request,
            Callback(&PlayFabApiTest::OnGetObjects2),
            Callback(&PlayFabApiTest::OnErrorSharedCallback),
            customData);
    }
    void PlayFabApiTest::OnGetObjects2(const GetObjectsResponse& result, void* customData)
    {
        TestContext* testContext = reinterpret_cast<TestContext*>(customData);

        int actualDataValue = -1000;
        auto found = result.Objects.find(TEST_DATA_KEY);
        if (found != result.Objects.end())
            actualDataValue = atoi(found->second.EscapedDataObject.c_str());
        else
            testContext->Fail("Object saved in SetObjects cannot be found in GetObjects.");

        if (testMessageInt != actualDataValue)
            testContext->Fail("User data not updated as expected.");
        else
            testContext->Pass();
    }

    ///
    ///
    /// Add test calls to this method, after implementation
    ///
    ///

    void PlayFabApiTest::AddTests()
    {
        AddTest("InvalidLogin", &PlayFabApiTest::InvalidLogin);
        AddTest("InvalidLoginLambda", &PlayFabApiTest::InvalidLoginLambda);
        AddTest("InvalidRegistration", &PlayFabApiTest::InvalidRegistration);
        AddTest("LoginOrRegister", &PlayFabApiTest::LoginOrRegister);
        AddTest("LoginWithAdvertisingId", &PlayFabApiTest::LoginWithAdvertisingId);
        AddTest("UserDataApi", &PlayFabApiTest::UserDataApi);
        AddTest("PlayerStatisticsApi", &PlayFabApiTest::PlayerStatisticsApi);
        AddTest("UserCharacter", &PlayFabApiTest::UserCharacter);
        AddTest("LeaderBoard", &PlayFabApiTest::LeaderBoard);
        AddTest("AccountInfo", &PlayFabApiTest::AccountInfo);
        AddTest("CloudScript", &PlayFabApiTest::CloudScript);
        AddTest("CloudScriptLambda", &PlayFabApiTest::CloudScriptLambda);
        AddTest("CloudScriptError", &PlayFabApiTest::CloudScriptError);
        AddTest("WriteEvent", &PlayFabApiTest::WriteEvent);
        AddTest("GetEntityToken", &PlayFabApiTest::GetEntityToken);
        AddTest("ObjectApi", &PlayFabApiTest::ObjectApi);
    }

    void PlayFabApiTest::ClassSetUp()
    {
        // Make sure PlayFab state is clean.
        PlayFabSettings::ForgetAllCredentials();

        playFabId = "";
        entityId = "";
        entityType = "";
        testMessageInt = 0;
        testMessageTime = 0;
    }

    void PlayFabApiTest::SetUp(TestContext& testContext)
    {
        if (!TITLE_INFO_SET)
            testContext.Skip(); // We cannot do client tests if the titleId is not given
    }

    void PlayFabApiTest::Tick(TestContext& /*testContext*/)
    {
        // No work needed, async tests will end themselves
    }

    void PlayFabApiTest::ClassTearDown()
    {
        // Clean up any PlayFab state for next TestCase.
        PlayFabSettings::ForgetAllCredentials();
    }
}