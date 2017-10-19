#include "StdAfx.h"

#include <fstream>
#include <FlowBaseNode.h>
#include <PlayFabComboSdk/PlayFabCombo_ClientBus.h>
#include <PlayFabComboSdk/PlayFabCombo_ServerBus.h>
#include <PlayFabComboSdk/PlayFabCombo_SettingsBus.h>
#include <PlayFabComboSdk/PlayFabClientDataModels.h>
#include <PlayFabComboSdk/PlayFabServerDataModels.h>
#include <PlayFabComboSdk/PlayFabError.h>
#include <AzCore/JSON/document.h>

using namespace PlayFabComboSdk;
using namespace rapidjson;

enum PlayFabApiTestActiveState
{
    PENDING, // Not started
    ACTIVE, // Currently testing
    READY, // An answer is sent by the http thread, but the main thread hasn't finalized the test yet
    COMPLETE, // Test is finalized and recorded
    ABORTED // todo
};

enum PlayFabApiTestFinishState
{
    PASSED,
    FAILED,
    SKIPPED,
    TIMEDOUT
};

struct PfTestContext
{
    PfTestContext(AZStd::string name, void(*func)(PfTestContext& context)) :
        testName(name),
        activeState(PENDING),
        finishState(TIMEDOUT),
        testResultMsg(),
        testFunc(func),
        startTime(0),
        endTime(0)
    {
    };

    const AZStd::string testName;
    PlayFabApiTestActiveState activeState;
    PlayFabApiTestFinishState finishState;
    AZStd::string testResultMsg;
    void(*testFunc)(PfTestContext& context);
    time_t startTime;
    time_t endTime;

    AZStd::string GenerateTestSummary(time_t now)
    {
        time_t tempEndTime = (activeState == COMPLETE) ? endTime : now;
        time_t tempStartTime = (startTime != 0) ? startTime : now;

        AZStd::string temp;
        temp = std::to_string(tempEndTime - tempStartTime).c_str();
        while (temp.length() < 12)
            temp = " " + temp;
        temp += " ms, ";
        switch (finishState)
        {
        case PASSED: temp += "pass: "; break;
        case FAILED: temp += "FAILED: "; break;
        case SKIPPED: temp += "SKIPPED: "; break;
        case TIMEDOUT: temp += "TIMED OUT: "; break;
        }
        temp += testName;
        if (testResultMsg.length() > 0)
        {
            temp += " - ";
            temp += testResultMsg;
        }
        return temp;
    }
};

class PlayFabApiTests
{
public:
    static void InitializeTestSuite()
    {
        bool setupSuccessful = ClassSetup();

        // Reset testContexts if this has already been run (The results are kept for later viewing)
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
            delete *it;
        testContexts.clear();

        if (setupSuccessful)
        {
            testContexts.insert(testContexts.end(), new PfTestContext("InvalidLogin", InvalidLogin));
            testContexts.insert(testContexts.end(), new PfTestContext("InvalidRegistration", InvalidRegistration));
            testContexts.insert(testContexts.end(), new PfTestContext("LoginOrRegister", LoginOrRegister));
            testContexts.insert(testContexts.end(), new PfTestContext("LoginWithAdvertisingId", LoginWithAdvertisingId));
            testContexts.insert(testContexts.end(), new PfTestContext("UserDataApi", UserDataApi));
            testContexts.insert(testContexts.end(), new PfTestContext("UserStatisticsApi", PlayerStatisticsApi));
            testContexts.insert(testContexts.end(), new PfTestContext("UserCharacter", UserCharacter));
            testContexts.insert(testContexts.end(), new PfTestContext("LeaderBoard", LeaderBoard));
            testContexts.insert(testContexts.end(), new PfTestContext("AccountInfo", AccountInfo));
            testContexts.insert(testContexts.end(), new PfTestContext("CloudScript", CloudScript));
            testContexts.insert(testContexts.end(), new PfTestContext("WriteEvent", WriteEvent));
        }
    }

    static bool TickTestSuite()
    {
        int numPending;
        PlayFabCombo_ClientRequestBus::BroadcastResult(numPending, &PlayFabCombo_ClientRequests::GetPendingCalls);
        if (numPending > 0)
            return false;

        int unfinishedTests = 0;
        PfTestContext* nextTest = nullptr;
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
        {
            auto eachState = (*it)->activeState;

            if (eachState != COMPLETE && eachState != ABORTED)
                unfinishedTests++;

            if (eachState == ACTIVE || eachState == READY) // Find the active test, and prioritize it
                nextTest = *it;
            else if (eachState == PENDING && nextTest == nullptr) // Or find a test to start
                nextTest = *it;
        }

        if (nextTest != nullptr && nextTest->activeState == PENDING)
            StartTest(*nextTest);
        else if (nextTest != nullptr)
            TickTest(*nextTest);

        bool result = unfinishedTests == 0; // Return whether tests are complete
        return result;
    }

    static AZStd::string GenerateTestSummary()
    {
        _outputSummary.clear();

        time_t now = clock();
        int numPassed = 0;
        int numFailed = 0;
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
        {
            if (_outputSummary.length() != 0)
                _outputSummary += "\n";
            _outputSummary += (*it)->GenerateTestSummary(now);
            if ((*it)->finishState == PASSED) numPassed++;
            else if ((*it)->finishState == FAILED) numFailed++;
        }

        AZStd::string testCountLine = "\nTotal tests: ";
        testCountLine += AZStd::string(std::to_string(testContexts.size()).c_str());
        testCountLine += ", Passed: ";
        testCountLine += AZStd::string(std::to_string(numPassed).c_str());
        testCountLine += ", Failed: ";
        testCountLine += AZStd::string(std::to_string(numFailed).c_str());

        _outputSummary += testCountLine.c_str();
        return _outputSummary;
    }

private:
    static AZStd::string _outputSummary; // Basically a temp variable so I don't reallocate this constantly

    // A bunch of constants loaded from testTitleData.json
    static std::string TEST_TITLE_DATA_LOC;
    static AZStd::string buildIdentifier;
    static AZStd::string userEmail;
    const static AZStd::string TEST_DATA_KEY;
    const static AZStd::string TEST_STAT_NAME;
    static AZStd::string playFabId;
    static int testMessageInt;
    static time_t testMessageTime;
    static std::list<PfTestContext*> testContexts;

    static bool ClassSetup()
    {
        // README:
        // modify the TEST_TITLE_DATA_LOC to a location of a testTitleData.json file
        // The format of this file is described in the sdk readme
        //  - OR -
        // Comment the "return false;" below, and
        //   Fill in all the variables under: POPULATE THIS SECTION WITH REAL INFORMATION

        // Prefer to load path from environment variable, if present
        char* envPath = nullptr;
        size_t envPathStrLen;
        errno_t err = _dupenv_s(&envPath, &envPathStrLen, "PF_TEST_TITLE_DATA_JSON");
        if (err == 0 && envPath != nullptr)
            TEST_TITLE_DATA_LOC = envPath;
        if (envPath != nullptr)
            free(envPath);

        std::ifstream titleInput;
        if (TEST_TITLE_DATA_LOC.length() > 0)
            titleInput.open(TEST_TITLE_DATA_LOC, std::ios::binary | std::ios::in);
        if (titleInput)
        {
            int begin = titleInput.tellg();
            titleInput.seekg(0, std::ios::end);
            int end = titleInput.tellg();
            char* titleData = new char[end - begin];
            titleInput.seekg(0, std::ios::beg);
            titleInput.read(titleData, end - begin);
            titleData[end - begin] = '\0';

            Document testInputs;
            testInputs.Parse<0>(titleData);
            SetTitleInfo(testInputs);

            titleInput.close();
        }
        else
        {
            return false;
            // TODO: Put the info for your title here (Fallback in case it can't read from the file)

            // POPULATE THIS SECTION WITH REAL INFORMATION
            PlayFabCombo_SettingsRequestBus::Broadcast(&PlayFabCombo_SettingsRequests::SetTitleId, ""); // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            PlayFabCombo_SettingsRequestBus::Broadcast(&PlayFabCombo_SettingsRequests::SetDevSecretKey, ""); // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            userEmail = ""; // This is an email for any registered user (just so we can deliberately fail to log into it)
        }

        PlayFabCombo_SettingsRequestBus::BroadcastResult(buildIdentifier, &PlayFabCombo_SettingsRequests::GetBuildIdentifier);

        // Verify all the inputs won't cause crashes in the tests
        return static_cast<bool>(titleInput)
            // && !playFabSettings->titleId.empty()
            // && !playFabSettings->developerSecretKey.empty()
            && !buildIdentifier.empty()
            && !userEmail.empty();
    }

    /// <summary>
    /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
    /// (Also, we don't want lots of excess unused titles)
    /// </summary>
    static void SetTitleInfo(Document &testInputs)
    {
        // Parse all the inputs
        auto end = testInputs.MemberEnd();
        auto each = testInputs.FindMember("titleId");
        if (each != end) PlayFabCombo_SettingsRequestBus::Broadcast(&PlayFabCombo_SettingsRequests::SetTitleId, each->value.GetString());
        each = testInputs.FindMember("developerSecretKey");
        if (each != end) PlayFabCombo_SettingsRequestBus::Broadcast(&PlayFabCombo_SettingsRequests::SetDevSecretKey, each->value.GetString());

        each = testInputs.FindMember("userEmail");
        if (each != end) userEmail = each->value.GetString();
    }
    // Start a test, and block until the threaded response arrives
    static void StartTest(PfTestContext& testContext)
    {
        testContext.activeState = ACTIVE;
        testContext.startTime = clock();
        testContext.testFunc(testContext);
        // Async tests can't resolve this tick, so just return
    }

    static void TickTest(PfTestContext& testContext)
    {
        time_t now = clock();
        if (testContext.activeState != READY // Not finished
            && (now - testContext.startTime) < 15000) // Not timed out
            return;

        testContext.endTime = now;
        testContext.activeState = COMPLETE;
    }

    // This should be called in the api-responses, which are threaded.  This will allow TickTest to finalize the test
    static void EndTest(PfTestContext& testContext, PlayFabApiTestFinishState finishState, AZStd::string resultMsg)
    {
        testContext.testResultMsg = resultMsg;
        testContext.finishState = finishState;
        testContext.activeState = READY;
    }

    static void OnSharedError(const PlayFabError& error, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, FAILED, "Unexpected error: " + error.ErrorMessage);
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately log in with an inappropriate password,
    ///   and verify that the error displays as expected.
    /// </summary>
    static void InvalidLogin(PfTestContext& testContext)
    {
        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = userEmail;
        request.Password = "INVALID";
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, LoginWithEmailAddress, request, InvalidLoginSuccess, InvalidLoginFail, &testContext);
    }
    static void InvalidLoginSuccess(const ClientModels::LoginResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, FAILED, "Expected login to fail");
    }
    static void InvalidLoginFail(const PlayFabError& error, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (error.ErrorMessage.find("password") != -1)
            EndTest(*testContext, PASSED, "");
        else
            EndTest(*testContext, FAILED, "Password error message not found: " + error.ErrorMessage);
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately register a user with an invalid email and password
    ///   Verify that errorDetails are populated correctly.
    /// </summary>
    static void InvalidRegistration(PfTestContext& testContext)
    {
        ClientModels::RegisterPlayFabUserRequest request;
        request.Username = "X";
        request.Email = "x";
        request.Password = "x";
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, RegisterPlayFabUser, request, InvalidRegistrationSuccess, InvalidRegistrationFail, &testContext);
    }
    static void InvalidRegistrationSuccess(const ClientModels::RegisterPlayFabUserResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, FAILED, "Expected registration to fail");
    }
    static void InvalidRegistrationFail(const PlayFabError& error, void* customData)
    {
        bool foundEmailMsg, foundPasswordMsg;
        AZStd::string expectedEmailMsg = "Email address is not valid.";
        AZStd::string expectedPasswordMsg = "Password must be between";
        AZStd::string errorConcat;

        for (auto it = error.ErrorDetails.begin(); it != error.ErrorDetails.end(); ++it)
            errorConcat += it->second;
        foundEmailMsg = (errorConcat.find(expectedEmailMsg) != -1);
        foundPasswordMsg = (errorConcat.find(expectedPasswordMsg) != -1);

        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (foundEmailMsg && foundPasswordMsg)
            EndTest(*testContext, PASSED, "");
        else
            EndTest(*testContext, FAILED, "All error details: " + errorConcat);
    }

    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is correctly modified on the next call.
    /// Parameter types tested: string, Dictionary<string, string>, DateTime
    /// </summary>
    static void LoginOrRegister(PfTestContext& testContext)
    {
        ClientModels::LoginWithCustomIDRequest request;
        request.CustomId = buildIdentifier;
        request.CreateAccount = true;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, LoginWithCustomID, request, OnLoginOrRegister, OnSharedError, &testContext);
    }
    static void OnLoginOrRegister(const ClientModels::LoginResult& result, void* customData)
    {
        playFabId = result.PlayFabId;
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test that the login call sequence sends the AdvertisingId when set
    /// </summary>
    static void LoginWithAdvertisingId(PfTestContext& testContext)
    {
        // playFabSettings->advertisingIdType = playFabSettings->AD_TYPE_ANDROID_ID;
        // playFabSettings->advertisingIdValue = "PlayFabTestId";

        ClientModels::LoginWithCustomIDRequest request;
        request.CustomId = buildIdentifier;
        request.CreateAccount = true;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, LoginWithCustomID, request, OnLoginWithAdvertisingId, OnSharedError, &testContext);
    }
    static void OnLoginWithAdvertisingId(const ClientModels::LoginResult& result, void* customData)
    {
        // TODO: Need to wait for the NEXT api call to complete, and then test PlayFabSettings::advertisingIdType
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is correctly modified on the next call.
    /// Parameter types tested: string, Dictionary<string, string>, DateTime
    /// </summary>
    static void UserDataApi(PfTestContext& testContext)
    {
        bool isLoggedIn = false;
        PlayFabCombo_ClientRequestBus::BroadcastResult(isLoggedIn, &PlayFabCombo_ClientRequests::IsClientLoggedIn);
        if (!isLoggedIn)
        {
            EndTest(testContext, SKIPPED, "Earlier tests failed to log in");
            return;
        }

        ClientModels::GetUserDataRequest request;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetUserData, request, OnUserDataApiGet1, OnSharedError, &testContext);
    }
    static void OnUserDataApiGet1(const ClientModels::GetUserDataResult& result, void* customData)
    {
        auto it = result.Data.find(TEST_DATA_KEY);
        testMessageInt = (it == result.Data.end()) ? 1 : atoi(it->second.Value.c_str());
        // testMessageTime = it->second.LastUpdated; // Don't need the first time

        testMessageInt = (testMessageInt + 1) % 100;
        ClientModels::UpdateUserDataRequest updateRequest;

        // itoa is not avaialable in android
        char buffer[16];
        AZStd::string temp;
        sprintf(buffer, "%d", testMessageInt);
        temp.append(buffer);

        updateRequest.Data[TEST_DATA_KEY] = temp;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, UpdateUserData, updateRequest, OnUserDataApiUpdate, OnSharedError, customData);
    }
    static void OnUserDataApiUpdate(const ClientModels::UpdateUserDataResult& result, void* customData)
    {
        ClientModels::GetUserDataRequest request;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetUserData, request, OnUserDataApiGet2, OnSharedError, customData);
    }
    static void OnUserDataApiGet2(const ClientModels::GetUserDataResult& result, void* customData)
    {
        auto it = result.Data.find(TEST_DATA_KEY);
        int actualDataValue = (it == result.Data.end()) ? -1 : atoi(it->second.Value.c_str());
        testMessageTime = (it == result.Data.end()) ? 0 : it->second.LastUpdated;

        time_t now = time(nullptr);
        now = mktime(gmtime(&now));
        time_t minTime = now - (60 * 5);
        time_t maxTime = now + (60 * 5);

        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (it == result.Data.end())
            EndTest(*testContext, FAILED, "Expected user data not found.");
        else if (testMessageInt != actualDataValue)
            EndTest(*testContext, FAILED, "User data not updated as expected.");
        else if (!(minTime <= testMessageTime && testMessageTime <= maxTime))
            EndTest(*testContext, FAILED, "DateTime not parsed correctly.");
        else
            EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is saved correctly, and that specific types are tested
    /// Parameter types tested: Dictionary<string, int>
    /// </summary>
    static void PlayerStatisticsApi(PfTestContext& testContext)
    {
        bool isLoggedIn = false;
        PlayFabCombo_ClientRequestBus::BroadcastResult(isLoggedIn, &PlayFabCombo_ClientRequests::IsClientLoggedIn);
        if (!isLoggedIn)
        {
            EndTest(testContext, SKIPPED, "Earlier tests failed to log in");
            return;
        }

        ClientModels::GetPlayerStatisticsRequest getRequest;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetPlayerStatistics, getRequest, OnPlayerStatisticsApiGet1, OnSharedError, &testContext);
    }
    static void OnPlayerStatisticsApiGet1(const ClientModels::GetPlayerStatisticsResult& result, void* customData)
    {
        for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
            if (it->StatisticName == TEST_STAT_NAME)
                testMessageInt = (it == result.Statistics.end()) ? 1 : it->Value;
        // testMessageTime = it->second.LastUpdated; // Don't need the first time

        testMessageInt = (testMessageInt + 1) % 100;
        ClientModels::UpdatePlayerStatisticsRequest updateRequest;

        ClientModels::StatisticUpdate newStat;
        newStat.StatisticName = TEST_STAT_NAME;
        newStat.Value = testMessageInt;
        updateRequest.Statistics.push_back(newStat);
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, UpdatePlayerStatistics, updateRequest, OnPlayerStatisticsApiUpdate, OnSharedError, customData);
    }
    static void OnPlayerStatisticsApiUpdate(const ClientModels::UpdatePlayerStatisticsResult& result, void* customData)
    {
        ClientModels::GetPlayerStatisticsRequest getRequest;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetPlayerStatistics, getRequest, OnPlayerStatisticsApiGet2, OnSharedError, customData);
    }
    static void OnPlayerStatisticsApiGet2(const ClientModels::GetPlayerStatisticsResult& result, void* customData)
    {
        int actualStatValue = -1;
        for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
            if (it->StatisticName == TEST_STAT_NAME)
                actualStatValue = (it == result.Statistics.end()) ? 1 : it->Value;

        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (actualStatValue == -1)
            EndTest(*testContext, FAILED, "Expected Player statistic not found.");
        else if (testMessageInt != actualStatValue)
            EndTest(*testContext, FAILED, "Player statistic not updated as expected.");
        else
            EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Get or create the given test character for the given user
    /// Parameter types tested: Contained-Classes, string
    /// </summary>
    static void UserCharacter(PfTestContext& testContext)
    {
        ClientModels::ListUsersCharactersRequest request;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetAllUsersCharacters, request, OnUserCharacter, OnSharedError, &testContext);
    }
    static void OnUserCharacter(const ClientModels::ListUsersCharactersResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT AND SERVER API
    /// Test that leaderboard results can be requested
    /// Parameter types tested: List of contained-classes
    /// </summary>
    static void LeaderBoard(PfTestContext& testContext)
    {
        testMessageInt = 0;
        ClientModels::GetLeaderboardRequest clientRequest;
        clientRequest.MaxResultsCount = 3;
        clientRequest.StatisticName = TEST_STAT_NAME;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetLeaderboard, clientRequest, OnClientLeaderBoard, OnSharedError, &testContext);
        ServerModels::GetLeaderboardRequest serverRequest;
        serverRequest.MaxResultsCount = 3;
        serverRequest.StatisticName = TEST_STAT_NAME;
        EBUS_EVENT(PlayFabCombo_ServerRequestBus, GetLeaderboard, serverRequest, OnServerLeaderBoard, OnSharedError, &testContext);
    }
    static void OnClientLeaderBoard(const ClientModels::GetLeaderboardResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (result.Leaderboard.size() > 0)
            EndTest(*testContext, PASSED, "");
        else
            EndTest(*testContext, FAILED, "Leaderboard entry not found.");
    }
    static void OnServerLeaderBoard(const ServerModels::GetLeaderboardResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (result.Leaderboard.size() > 0)
            EndTest(*testContext, PASSED, "");
        else
            EndTest(*testContext, FAILED, "Leaderboard entry not found.");
    }

    /// <summary>
    /// CLIENT API
    /// Test that AccountInfo can be requested
    /// Parameter types tested: List of enum-as-strings converted to list of enums
    /// </summary>
    static void AccountInfo(PfTestContext& testContext)
    {
        ClientModels::GetAccountInfoRequest request;
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, GetAccountInfo, request, OnAccountInfo, OnSharedError, &testContext);
    }
    static void OnAccountInfo(const ClientModels::GetAccountInfoResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        // Enums-by-name can't really be tested in C++, the way they can in other languages
        if (result.AccountInfo == nullptr || result.AccountInfo->TitleInfo == nullptr || result.AccountInfo->TitleInfo->Origination.isNull())
            EndTest(*testContext, FAILED, "The Origination data is not present to test");
        else // Received data-format as expected
            EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test that CloudScript can be properly set up and invoked
    /// </summary>
    static void CloudScript(PfTestContext& testContext)
    {
        ClientModels::ExecuteCloudScriptRequest request;
        request.FunctionName = "helloWorld";
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, ExecuteCloudScript, request, OnHelloWorldCloudScript, OnSharedError, &testContext);
    }
    static void OnHelloWorldCloudScript(const ClientModels::ExecuteCloudScriptResult& result, void* customData)
    {
        auto strResult = (AZStd::string)result.FunctionResult;
        bool success = (strResult.find("Hello " + playFabId + "!") != -1);
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (!success)
            EndTest(*testContext, FAILED, strResult);
        else
            EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test that the client can publish custom PlayStream events
    /// </summary>
    static void WriteEvent(PfTestContext& testContext)
    {
        ClientModels::WriteClientPlayerEventRequest request;
        request.EventName = "ForumPostEvent";
        request.Timestamp = time(nullptr);
        request.Body["Subject"] = "My First Post";
        request.Body["Body"] = "My awesome post.";
        EBUS_EVENT(PlayFabCombo_ClientRequestBus, WritePlayerEvent, request, OnWritePlayerEvent, OnSharedError, &testContext);
    }
    static void OnWritePlayerEvent(const ClientModels::WriteEventResponse& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, PASSED, "");
    }
};
// C++ Static vars
std::string PlayFabApiTests::TEST_TITLE_DATA_LOC = "testTitleData.json";
AZStd::string PlayFabApiTests::_outputSummary;
AZStd::string PlayFabApiTests::buildIdentifier;
AZStd::string PlayFabApiTests::userEmail;
const AZStd::string PlayFabApiTests::TEST_DATA_KEY = "testCounter";
const AZStd::string PlayFabApiTests::TEST_STAT_NAME = "str";
std::list<PfTestContext*> PlayFabApiTests::testContexts;
AZStd::string PlayFabApiTests::playFabId;
int PlayFabApiTests::testMessageInt;
time_t PlayFabApiTests::testMessageTime;

class CFlowNode_PlayFabComboApiTests : public CFlowBaseNode<eNCT_Instanced>
{
public:
    CFlowNode_PlayFabComboApiTests(SActivationInfo* pActInfo)
    {
    }

    IFlowNodePtr Clone(SActivationInfo *pActInfo) override
    {
        return new CFlowNode_PlayFabComboApiTests(pActInfo);
    }

    void GetMemoryUsage(ICrySizer* s) const override
    {
        s->Add(*this);
    }

    void GetConfiguration(SFlowNodeConfig& config) override
    {
        static const SInputPortConfig in_config[] = {
            InputPortConfig<SFlowSystemVoid>("Activate", _HELP("Run the PlayFabApiTests")),
            { 0 }
        };
        static const SOutputPortConfig out_config[] = {
            // Could probably put real api types here
            OutputPortConfig<AZStd::string>("Summary", _HELP("A summary of the tests (once complete)")),
            { 0 }
        };
        config.sDescription = _HELP("PlayFab Combo gem test node");
        config.pInputPorts = in_config;
        config.pOutputPorts = out_config;
        config.SetCategory(EFLN_APPROVED);
    }

    void ProcessEvent(EFlowEvent event, SActivationInfo* pActInfo) override
    {
        switch (event)
        {
        case eFE_Update:
            if (PlayFabApiTests::TickTestSuite())
            {
                pActInfo->pGraph->SetRegularlyUpdated(pActInfo->myID, false);
                auto outputSummary = PlayFabApiTests::GenerateTestSummary();
                AZ_TracePrintf("PlayFab", outputSummary.c_str());
                ActivateOutput(pActInfo, 0, string(outputSummary.c_str()));
            }
            break;
        case eFE_Activate:
            pActInfo->pGraph->SetRegularlyUpdated(pActInfo->myID, true);
            PlayFabApiTests::InitializeTestSuite();
            break;
            //case eFE_FinalActivate:
        }
        auto lastDebugMessage = PlayFabApiTests::GenerateTestSummary();
    }
};

REGISTER_FLOW_NODE("PlayFab:PlayFabComboApiTests", CFlowNode_PlayFabComboApiTests);
