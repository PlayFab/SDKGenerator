#include "StdAfx.h"
#include "FlowBaseNode.h"
#include "PlayFabClientAPI.h"
#include "PlayFabServerAPI.h"
#include "PlayFabSettings.h"
#include "PlayFabSdkGem.h"

using namespace PlayFab;

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
    PfTestContext(Aws::String name, void(*func)(PfTestContext& context)) :
        testName(name),
        activeState(PENDING),
        finishState(TIMEDOUT),
        testResultMsg(),
        testFunc(func),
        startTime(0),
        endTime(0)
    {
    };

    const Aws::String testName;
    PlayFabApiTestActiveState activeState;
    PlayFabApiTestFinishState finishState;
    Aws::String testResultMsg;
    void(*testFunc)(PfTestContext& context);
    time_t startTime;
    time_t endTime;

    Aws::String GenerateSummary(time_t now)
    {
        time_t tempEndTime = (activeState == COMPLETE) ? endTime : now;
        time_t tempStartTime = (startTime != 0) ? startTime : now;

        Aws::String temp;
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
        ClassSetup();

        // Reset testContexts if this has already been run (The results are kept for later viewing)
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
            delete *it;
        testContexts.clear();

        testContexts.insert(testContexts.end(), new PfTestContext("InvalidLogin", InvalidLogin));
        testContexts.insert(testContexts.end(), new PfTestContext("InvalidRegistration", InvalidRegistration));
        testContexts.insert(testContexts.end(), new PfTestContext("LoginOrRegister", LoginOrRegister));
        testContexts.insert(testContexts.end(), new PfTestContext("LoginWithAdvertisingId", LoginWithAdvertisingId));
        testContexts.insert(testContexts.end(), new PfTestContext("UserDataApi", UserDataApi));
        testContexts.insert(testContexts.end(), new PfTestContext("UserStatisticsApi", UserStatisticsApi));
        testContexts.insert(testContexts.end(), new PfTestContext("UserCharacter", UserCharacter));
        testContexts.insert(testContexts.end(), new PfTestContext("LeaderBoard", LeaderBoard));
        testContexts.insert(testContexts.end(), new PfTestContext("AccountInfo", AccountInfo));
        testContexts.insert(testContexts.end(), new PfTestContext("CloudScript", CloudScript));
    }

    static bool TickTestSuite()
    {
        if (PlayFabRequestManager::playFabHttp.GetPendingCalls() > 0)
            return false; // The active test won't advance until all outstanding calls return

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

    static Aws::String GenerateSummary()
    {
        _outputSummary = "";
        _outputSummary._Grow(10000, false);

        time_t now = clock();
        int numPassed = 0;
        int numFailed = 0;
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
        {
            if (_outputSummary.length() != 0)
                _outputSummary += '\n';
            _outputSummary += (*it)->GenerateSummary(now);
            if ((*it)->finishState == PASSED) numPassed++;
            else if ((*it)->finishState == FAILED) numFailed++;
        }

        std::string testCountLine = "\nTotal tests: ";
        testCountLine += std::to_string(testContexts.size());
        testCountLine += ", Passed: ";
        testCountLine += std::to_string(numPassed);
        testCountLine += ", Failed: ";
        testCountLine += std::to_string(numFailed);

        _outputSummary += testCountLine.c_str();
        return _outputSummary;
    }

private:
    static Aws::String _outputSummary; // Basically a temp variable so I don't reallocate this constantly

    // A bunch of constants: TODO: load these from testTitleData.json
    static Aws::String titleId;
    static Aws::String developerSecretKey;
    static Aws::String titleCanUpdateSettings;
    static Aws::String userName;
    static Aws::String userEmail;
    static Aws::String userPassword;
    static Aws::String characterName;
    static Aws::String TEST_DATA_KEY;
    static Aws::String TEST_STAT_NAME;
    static Aws::String playFabId;
    static int testMessageInt;
    static time_t testMessageTime;
    static std::list<PfTestContext*> testContexts;

    static void ClassSetup()
    {
        // TODO: Read from testTitleData.json here
        titleId = "6195";
        developerSecretKey = "TKHKZYUQF1AFKYOKPKAZJ1HRNQY61KJZC6E79ZF9YYXR9Q74CT";
        titleCanUpdateSettings = "true";
        userName = "paul";
        userEmail = "paul@playfab.com";
        userPassword = "testPassword";
        characterName = "Ragnar";

        PlayFabSettings::titleId = titleId;
        PlayFabSettings::developerSecretKey = developerSecretKey;
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
            && (now - testContext.startTime) < 3000) // Not timed out
            return;

        testContext.endTime = now;
        testContext.activeState = COMPLETE;
    }

    // This should be called in the api-responses, which are threaded.  This will allow TickTest to finalize the test
    static void EndTest(PfTestContext& testContext, PlayFabApiTestFinishState finishState, Aws::String resultMsg)
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
        request.Password = userPassword + "INVALID";
        PlayFabClientAPI::LoginWithEmailAddress(request, InvalidLoginSuccess, InvalidLoginFail, &testContext);
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
    /// Try to deliberately register a character with an invalid email and password.
    ///   Verify that errorDetails are populated correctly.
    /// </summary>
    static void InvalidRegistration(PfTestContext& testContext)
    {
        ClientModels::RegisterPlayFabUserRequest request;
        request.Username = userName;
        request.Email = "x";
        request.Password = "x";
        PlayFabClientAPI::RegisterPlayFabUser(request, InvalidRegistrationSuccess, InvalidRegistrationFail, &testContext);
    }
    static void InvalidRegistrationSuccess(const ClientModels::RegisterPlayFabUserResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, FAILED, "Expected registration to fail");
    }
    static void InvalidRegistrationFail(const PlayFabError& error, void* customData)
    {
        bool foundEmailMsg, foundPasswordMsg;
        Aws::String expectedEmailMsg = "Email address is not valid.";
        Aws::String expectedPasswordMsg = "Password must be between";
        Aws::String errorConcat;

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
        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = userEmail;
        request.Password = userPassword;
        PlayFabClientAPI::LoginWithEmailAddress(request, OnLoginOrRegister, OnSharedError, &testContext);
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
        PlayFabSettings::advertisingIdType = PlayFabSettings::AD_TYPE_ANDROID_ID;
        PlayFabSettings::advertisingIdValue = "PlayFabTestId";

        ClientModels::LoginWithEmailAddressRequest request;
        request.Email = userEmail;
        request.Password = userPassword;
        PlayFabClientAPI::LoginWithEmailAddress(request, OnLoginWithAdvertisingId, OnSharedError, &testContext);
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
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            EndTest(testContext, SKIPPED, "Earlier tests failed to log in");
            return;
        }

        ClientModels::GetUserDataRequest request;
        PlayFabClientAPI::GetUserData(request, OnUserDataApiGet1, OnSharedError, &testContext);
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
        Aws::String temp;
        sprintf(buffer, "%d", testMessageInt);
        temp.append(buffer);

        updateRequest.Data[TEST_DATA_KEY] = temp;
        PlayFabClientAPI::UpdateUserData(updateRequest, OnUserDataApiUpdate, OnSharedError, customData);
    }
    static void OnUserDataApiUpdate(const ClientModels::UpdateUserDataResult& result, void* customData)
    {
        ClientModels::GetUserDataRequest request;
        PlayFabClientAPI::GetUserData(request, OnUserDataApiGet2, OnSharedError, customData);
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
    static void UserStatisticsApi(PfTestContext& testContext)
    {
        if (!PlayFabClientAPI::IsClientLoggedIn())
        {
            EndTest(testContext, SKIPPED, "Earlier tests failed to log in");
            return;
        }

        PlayFabClientAPI::GetUserStatistics(OnUserStatisticsApiGet1, OnSharedError, &testContext);
    }
    static void OnUserStatisticsApiGet1(const ClientModels::GetUserStatisticsResult& result, void* customData)
    {
        auto it = result.UserStatistics.find(TEST_STAT_NAME);
        testMessageInt = (it == result.UserStatistics.end()) ? 1 : it->second;
        // testMessageTime = it->second.LastUpdated; // Don't need the first time

        testMessageInt = (testMessageInt + 1) % 100;
        ClientModels::UpdateUserStatisticsRequest updateRequest;

        updateRequest.UserStatistics[TEST_STAT_NAME] = testMessageInt;
        PlayFabClientAPI::UpdateUserStatistics(updateRequest, OnUserStatisticsApiUpdate, OnSharedError, customData);
    }
    static void OnUserStatisticsApiUpdate(const ClientModels::UpdateUserStatisticsResult& result, void* customData)
    {
        PlayFabClientAPI::GetUserStatistics(OnUserStatisticsApiGet2, OnSharedError, customData);
    }
    static void OnUserStatisticsApiGet2(const ClientModels::GetUserStatisticsResult& result, void* customData)
    {
        auto it = result.UserStatistics.find(TEST_STAT_NAME);
        int actualStatValue = (it == result.UserStatistics.end()) ? 1 : it->second;

        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (it == result.UserStatistics.end())
            EndTest(*testContext, FAILED, "Expected user statistic not found.");
        else if (testMessageInt != actualStatValue)
            EndTest(*testContext, FAILED, "User statistic not updated as expected.");
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
        PlayFabClientAPI::GetAllUsersCharacters(request, OnUserCharacter, OnSharedError, &testContext);
    }
    static void OnUserCharacter(const ClientModels::ListUsersCharactersResult& result, void* customData)
    {
        bool charFound = false;
        for (auto it = result.Characters.begin(); it != result.Characters.end(); ++it)
            if (it->CharacterName == characterName)
                charFound = true;

        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (charFound)
            EndTest(*testContext, PASSED, "");
        else
            EndTest(*testContext, FAILED, "Character not found");
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
        PlayFabClientAPI::GetLeaderboard(clientRequest, OnClientLeaderBoard, OnSharedError, &testContext);
        ServerModels::GetLeaderboardRequest serverRequest;
        serverRequest.MaxResultsCount = 3;
        serverRequest.StatisticName = TEST_STAT_NAME;
        PlayFabServerAPI::GetLeaderboard(serverRequest, OnServerLeaderBoard, OnSharedError, &testContext);
    }
    static void OnClientLeaderBoard(const ClientModels::GetLeaderboardResult& result, void* customData)
    {
        bool foundEntry = false;
        for (auto it = result.Leaderboard.begin(); it != result.Leaderboard.end(); ++it)
            if (it->PlayFabId == playFabId)
                foundEntry++;
        if (foundEntry)
            testMessageInt++;
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (testMessageInt == 2)
            EndTest(*testContext, PASSED, "");
    }
    static void OnServerLeaderBoard(const ServerModels::GetLeaderboardResult& result, void* customData)
    {
        bool foundEntry = false;
        for (auto it = result.Leaderboard.begin(); it != result.Leaderboard.end(); ++it)
            if (it->PlayFabId == playFabId)
                foundEntry++;
        if (foundEntry)
            testMessageInt++;
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (testMessageInt == 2)
            EndTest(*testContext, PASSED, "");
    }

    /// <summary>
    /// CLIENT API
    /// Test that AccountInfo can be requested
    /// Parameter types tested: List of enum-as-strings converted to list of enums
    /// </summary>
    static void AccountInfo(PfTestContext& testContext)
    {
        ClientModels::GetAccountInfoRequest request;
        PlayFabClientAPI::GetAccountInfo(request, OnAccountInfo, OnSharedError, &testContext);
    }
    static void OnAccountInfo(const ClientModels::GetAccountInfoResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        // Enums-by-name can't really be tested in C++, the way they can in other languages
        if (result.AccountInfo == nullptr || result.AccountInfo->TitleInfo == nullptr || result.AccountInfo->TitleInfo->Origination.isNull())
            EndTest(*testContext, FAILED, "The Origination data is not present to test");
        else if (result.AccountInfo->TitleInfo->Origination.mValue != ClientModels::UserOriginationOrganic)
            EndTest(*testContext, FAILED, "The Origination does not match expected value");
        else // Received data-format as expected
            EndTest(*testContext, PASSED, "");
        auto output = result.AccountInfo->TitleInfo->Origination.mValue; // TODO: Basic verification of this value (range maybe?)
    }

    /// <summary>
    /// CLIENT API
    /// Test that CloudScript can be properly set up and invoked
    /// </summary>
    static void CloudScript(PfTestContext& testContext)
    {
        ClientModels::GetCloudScriptUrlRequest request;
        PlayFabClientAPI::GetCloudScriptUrl(request, OnCloudUrl, OnSharedError, &testContext);
    }
    static void OnCloudUrl(const ClientModels::GetCloudScriptUrlResult& result, void* customData)
    {
        ClientModels::RunCloudScriptRequest request;
        request.ActionId = "helloWorld";
        PlayFabClientAPI::RunCloudScript(request, OnHelloWorldCloudScript, OnSharedError, customData);
    }
    static void OnHelloWorldCloudScript(const ClientModels::RunCloudScriptResult& result, void* customData)
    {
        bool success = (result.ResultsEncoded.find("Hello " + playFabId + "!") != -1);
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        if (!success)
            EndTest(*testContext, FAILED, result.ResultsEncoded);
        else
            EndTest(*testContext, PASSED, "");
    }
};
// C++ Static vars
Aws::String PlayFabApiTests::_outputSummary;
Aws::String PlayFabApiTests::titleId;
Aws::String PlayFabApiTests::developerSecretKey;
Aws::String PlayFabApiTests::titleCanUpdateSettings;
Aws::String PlayFabApiTests::userName;
Aws::String PlayFabApiTests::userEmail;
Aws::String PlayFabApiTests::userPassword;
Aws::String PlayFabApiTests::characterName;
Aws::String PlayFabApiTests::TEST_DATA_KEY = "testCounter";
Aws::String PlayFabApiTests::TEST_STAT_NAME = "str";
std::list<PfTestContext*> PlayFabApiTests::testContexts;
Aws::String PlayFabApiTests::playFabId;
int PlayFabApiTests::testMessageInt;
time_t PlayFabApiTests::testMessageTime;

class CFlowNode_PlayFabApiTests : public CFlowBaseNode<eNCT_Instanced>
{
public:
    CFlowNode_PlayFabApiTests(SActivationInfo* pActInfo)
    {
    }

    virtual IFlowNodePtr Clone(SActivationInfo *pActInfo) override
    {
        return new CFlowNode_PlayFabApiTests(pActInfo);
    }

    virtual void GetMemoryUsage(ICrySizer* s) const override
    {
        s->Add(*this);
    }

    virtual void GetConfiguration(SFlowNodeConfig& config) override
    {
        static const SInputPortConfig in_config[] = {
            InputPortConfig<SFlowSystemVoid>("Activate", _HELP("Run the PlayFabApiTests")),
            { 0 }
        };
        static const SOutputPortConfig out_config[] = {
            // Could probably put real api types here
            OutputPortConfig<Aws::String>("Summary", _HELP("A summary of the tests (once complete)")),
            { 0 }
        };
        config.sDescription = _HELP("PlayFab gem test node");
        config.pInputPorts = in_config;
        config.pOutputPorts = out_config;
        config.SetCategory(EFLN_APPROVED);
    }

    virtual void ProcessEvent(EFlowEvent event, SActivationInfo* pActInfo) override
    {
        switch (event)
        {
        case eFE_Update:
            if (PlayFabApiTests::TickTestSuite())
            {
                pActInfo->pGraph->SetRegularlyUpdated(pActInfo->myID, false);
                //ActivateOutput(pActInfo, 0, string(PlayFabApiTests::GenerateSummary().c_str()));
            }
            break;
        case eFE_Activate:
            pActInfo->pGraph->SetRegularlyUpdated(pActInfo->myID, true);
            PlayFabApiTests::InitializeTestSuite();
            break;
            //case eFE_FinalActivate:
        }
        PlayFabSdk::PlayFabSdkGem::lastDebugMessage = PlayFabApiTests::GenerateSummary();
    }
};

REGISTER_FLOW_NODE("PlayFab:PlayFabApiTests", CFlowNode_PlayFabApiTests);
