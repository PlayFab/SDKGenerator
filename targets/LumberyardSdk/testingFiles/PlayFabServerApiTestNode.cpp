#include "StdAfx.h"

#include <fstream>
#include <FlowBaseNode.h>
#include <PlayFabServerSdk/PlayFabServer_ServerBus.h>
#include <PlayFabServerSdk/PlayFabServer_SettingsBus.h>
#include <PlayFabServerSdk/PlayFabServerDataModels.h>
#include <PlayFabServerSdk/PlayFabError.h>
#include <AzCore/JSON/document.h>

using namespace PlayFabServerSdk;
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

        testContexts.insert(testContexts.end(), new PfTestContext("GetCatalog", GetCatalog));
    }

    static bool TickTestSuite()
    {
        int numPending;
        PlayFabServer_ServerRequestBus::BroadcastResult(numPending, &PlayFabServer_ServerRequests::GetPendingCalls);
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
            PlayFabServer_SettingsRequestBus::Broadcast(&PlayFabServer_SettingsRequests::SetTitleId, ""); // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            PlayFabServer_SettingsRequestBus::Broadcast(&PlayFabServer_SettingsRequests::SetDevSecretKey, ""); // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            userEmail = ""; // This is an email for any registered user (just so we can deliberately fail to log into it)
        }

        PlayFabServer_SettingsRequestBus::BroadcastResult(buildIdentifier, &PlayFabServer_SettingsRequests::GetBuildIdentifier);

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
        if (each != end) PlayFabServer_SettingsRequestBus::Broadcast(&PlayFabServer_SettingsRequests::SetTitleId, each->value.GetString());
        each = testInputs.FindMember("developerSecretKey");
        if (each != end) PlayFabServer_SettingsRequestBus::Broadcast(&PlayFabServer_SettingsRequests::SetDevSecretKey, each->value.GetString());

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

    static void GetCatalog(PfTestContext& testContext)
    {
        ServerModels::GetCatalogItemsRequest request;
        EBUS_EVENT(PlayFabServer_ServerRequestBus, GetCatalogItems, request, GetCatalogSuccess, OnSharedError, &testContext);
    }
    static void GetCatalogSuccess(const ServerModels::GetCatalogItemsResult& result, void* customData)
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

class CFlowNode_PlayFabServerApiTests : public CFlowBaseNode<eNCT_Instanced>
{
public:
    CFlowNode_PlayFabServerApiTests(SActivationInfo* pActInfo)
    {
    }

    IFlowNodePtr Clone(SActivationInfo *pActInfo) override
    {
        return new CFlowNode_PlayFabServerApiTests(pActInfo);
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
        config.sDescription = _HELP("PlayFab Server gem test node");
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

REGISTER_FLOW_NODE("PlayFab:PlayFabServerApiTests", CFlowNode_PlayFabServerApiTests);
