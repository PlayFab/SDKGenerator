#include "StdAfx.h"

#include <fstream>
#include <IPlayFabSdkGem.h>
#include "FlowBaseNode.h"
#include "PlayFabApiTestGem.h"

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
        playFabSdkGem = GetISystem()->GetGemManager()->GetGem<IPlayFabSdkGem>();
        if (!playFabSdkGem)
            return;
        playFabSettings = playFabSdkGem->GetPlayFabSettings();
        serverApi = playFabSdkGem->GetServerApi();

        ClassSetup();

        // Reset testContexts if this has already been run (The results are kept for later viewing)
        for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
            delete *it;
        testContexts.clear();

        testContexts.insert(testContexts.end(), new PfTestContext("GetCatalog", GetCatalog));
    }

    static bool TickTestSuite()
    {
        if (!playFabSdkGem)
            return true; // Can't continue if we can't access the PlayFabSdkGem
        if (playFabSdkGem->GetPendingCalls() > 0)
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
    static IPlayFabSdkGem* playFabSdkGem;
    static PlayFabSettings* playFabSettings;
    static IPlayFabServerApi* serverApi;
    static Aws::String _outputSummary; // Basically a temp variable so I don't reallocate this constantly

    // A bunch of constants loaded from testTitleData.json
    static Aws::String titleId;
    static Aws::String developerSecretKey;
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

    static bool ClassSetup()
    {
        // README:
        // modify the TEST_TITLE_DATA_LOC to a location of a testTitleData.json file
        // The format of this file is described in the sdk readme
        //  - OR -
        // Comment the "return false;" below, and
        //   Fill in all the variables under: POPULATE THIS SECTION WITH REAL INFORMATION

        std::ifstream titleInput;
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
            playFabSettings->titleId = ""; // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            userName = ""; // This is an arbitrary user name, which will be utilized for this test
            userEmail = ""; // This is the email for the user
            userPassword = ""; // This is the password for the user
            characterName = ""; // This should be a valid character on the given user's account
        }

        // Verify all the inputs won't cause crashes in the tests
        return static_cast<bool>(titleInput)
            && !playFabSettings->titleId.empty()
            && !userName.empty()
            && !userEmail.empty()
            && !userPassword.empty()
            && !characterName.empty();
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
        if (each != end) playFabSettings->titleId = each->value.GetString();

        each = testInputs.FindMember("userName");
        if (each != end) userName = each->value.GetString();
        each = testInputs.FindMember("userEmail");
        if (each != end) userEmail = each->value.GetString();
        each = testInputs.FindMember("userPassword");
        if (each != end) userPassword = each->value.GetString();

        each = testInputs.FindMember("characterName");
        if (each != end) characterName = each->value.GetString();
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

    static void GetCatalog(PfTestContext& testContext)
    {
        ServerModels::GetCatalogItemsRequest request;
        serverApi->GetCatalogItems(request, InvalidLoginSuccess, OnSharedError, &testContext);
    }
    static void InvalidLoginSuccess(const ServerModels::GetCatalogItemsResult& result, void* customData)
    {
        PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
        EndTest(*testContext, PASSED, "");
    }
};
// C++ Static vars
IPlayFabSdkGem* PlayFabApiTests::playFabSdkGem;
PlayFabSettings* PlayFabApiTests::playFabSettings;
IPlayFabServerApi* PlayFabApiTests::serverApi;
const std::string PlayFabApiTests::TEST_TITLE_DATA_LOC = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json";
Aws::String PlayFabApiTests::_outputSummary;
Aws::String PlayFabApiTests::userName;
Aws::String PlayFabApiTests::userEmail;
Aws::String PlayFabApiTests::userPassword;
Aws::String PlayFabApiTests::characterName;
const Aws::String PlayFabApiTests::TEST_DATA_KEY = "testCounter";
const Aws::String PlayFabApiTests::TEST_STAT_NAME = "str";
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

    IFlowNodePtr Clone(SActivationInfo *pActInfo) override
    {
        return new CFlowNode_PlayFabApiTests(pActInfo);
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
            OutputPortConfig<Aws::String>("Summary", _HELP("A summary of the tests (once complete)")),
            { 0 }
        };
        config.sDescription = _HELP("PlayFab gem test node");
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
                //ActivateOutput(pActInfo, 0, string(PlayFabApiTests::GenerateSummary().c_str()));
            }
            break;
        case eFE_Activate:
            pActInfo->pGraph->SetRegularlyUpdated(pActInfo->myID, true);
            PlayFabApiTests::InitializeTestSuite();
            break;
            //case eFE_FinalActivate:
        }
        PlayFabApiTest::PlayFabApiTestGem::lastDebugMessage = PlayFabApiTests::GenerateSummary();
    }
};

REGISTER_FLOW_NODE("PlayFab:PlayFabApiTests", CFlowNode_PlayFabApiTests);
