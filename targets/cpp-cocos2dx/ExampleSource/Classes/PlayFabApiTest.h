#include <fstream>
#include "cocos2d.h"
#include "PlayFabSettings.h"
#include "PlayFabClientDataModels.h"
#include "PlayFabClientAPI.h"

#pragma once

using namespace rapidjson;
using namespace PlayFab;
using namespace ClientModels;

#if CC_TARGET_PLATFORM == CC_PLATFORM_ANDROID
#include <string>
#include <sstream>

namespace std {
    template <typename T>
    string to_string(T value)
    {
        ostringstream os;
        os << value;
        return os.str();
    }
}
#endif

typedef bool(*unittest_pointer)(void);

namespace PlayFabApiTest
{
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

    inline const char* PlayFabApiTestFinishState_ToString(PlayFabApiTestFinishState val)
    {
        switch (val)
        {
        case PASSED: return "PASSED";
        case FAILED: return "FAILED";
        case SKIPPED: return "SKIPPED";
        case TIMEDOUT: return "TIMEDOUT";
        default: return "ERROR";
        }
    }

    class TestCaseReport : public PlayFabBaseModel
    {
    public:
        std::string classname; // suite class name
        std::string name; // test name
        double time; // Duration in seconds
        // Sub-Fields in the XML spec
        /// <summary> message is the descriptive text used to debug the test failure </summary>
        std::string message;
        /// <summary> The xml spec allows failureText to be an arbitrary string.  When possible it should match finishState (But not required) </summary>
        std::string failureText;
        PlayFabApiTestFinishState finishState;

        void writeJSON(PFStringJsonWriter& writer) override
        {
            writer.StartObject();
            writer.String("classname"); writer.String(classname.c_str());
            writer.String("name"); writer.String(name.c_str());
            writer.String("time"); writer.Double(time);
            writer.String("message"); writer.String(message.c_str());
            writer.String("failureText"); writer.String(failureText.c_str());
            writer.String("finishState"); writer.String(PlayFabApiTestFinishState_ToString(finishState));
            writer.EndObject();
        }

        bool readFromValue(const rapidjson::Value& obj) override
        {
            return false; // We only intend to write to Cloud Script, but not read
        }
    };

    class TestSuiteReport : public PlayFabBaseModel
    {
    public:
        std::string name = "default"; // suite class name
        int tests = 0; // total test count
        int failures = 0; // count tests in state
        int errors = 0; // count tests in state
        int skipped = 0; // count tests in state
        double time = 0; // Duration in seconds
        time_t timestamp = 0;
        // std::map<std::string, std::string> properties; // Probably going to avoid using this unless it's absolutely necessary
        // Useful for debugging but not part of the serialized format (ignored by writeJSON)
        int passed;
        std::list<TestCaseReport*> testResults;

        ~TestSuiteReport()
        {
            for (auto it = testResults.begin(); it != testResults.end(); ++it)
                delete (*it);
        }

        void writeJSON(PFStringJsonWriter& writer) override
        {
            writer.StartObject();
            writer.String("name"); writer.String(name.c_str());
            writer.String("tests"); writer.Int(tests);
            writer.String("failures"); writer.Int(failures);
            writer.String("errors"); writer.Int(errors);
            writer.String("skipped"); writer.Int(skipped);
            writer.String("time"); writer.Double(time);
            writer.String("timestamp"); PlayFab::writeDatetime(timestamp, writer);

            writer.String("testResults"); writer.StartArray();
            for (std::list<TestCaseReport*>::iterator it = testResults.begin(); it != testResults.end(); ++it)
                (*it)->writeJSON(writer);
            writer.EndArray();
            writer.EndObject();
        }

        bool readFromValue(const rapidjson::Value& obj) override
        {
            return false; // We only intend to write to Cloud Script, but not read
        }
    };

    class CsSaveRequest : public PlayFabBaseModel
    {
    public:
        std::string customId;
        static const int REPORT_DEFAULT_SIZE = 1;
        TestSuiteReport testReport[REPORT_DEFAULT_SIZE]; // The expected format is a list of TestSuiteReports, but this framework only submits one

        void writeJSON(PFStringJsonWriter& writer) override
        {
            writer.StartObject();
            writer.String("customId"); writer.String(customId.c_str());
            writer.String("testReport"); writer.StartArray();
            for (int i = 0; i < REPORT_DEFAULT_SIZE; i++)
                testReport[i].writeJSON(writer);
            writer.EndArray();
            writer.EndObject();
        }

        bool readFromValue(const rapidjson::Value& obj) override
        {
            return false; // We only intend to write to Cloud Script, but not read
        }
    };

    struct PfTestContext
    {
        PfTestContext(std::string name, void(*func)(PfTestContext& context)) :
            testName(name),
            activeState(PENDING),
            finishState(TIMEDOUT),
            testResultMsg(),
            testFunc(func),
            startTime(0),
            endTime(0)
        {
        };

        const std::string testName;
        PlayFabApiTestActiveState activeState;
        PlayFabApiTestFinishState finishState;
        std::string testResultMsg;
        void(*testFunc)(PfTestContext& context);
        time_t startTime;
        time_t endTime;

        std::string GenerateSummary(time_t now)
        {
            time_t tempEndTime = (activeState == COMPLETE) ? endTime : now;
            time_t tempStartTime = (startTime != 0) ? startTime : now;

            std::string temp;
            temp = std::to_string((tempEndTime - tempStartTime) * 1000 / CLOCKS_PER_SEC).c_str();
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
            suiteState = ACTIVE;
            suiteStartTime = clock();
            bool setupSuccessful = ClassSetup();

            // Reset testContexts if this has already been run (The results are kept for later viewing)
            for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
                delete *it;
            testContexts.clear();

            if (setupSuccessful)
            {
                testContexts.insert(testContexts.end(), new PfTestContext("InvalidLogin", InvalidLogin));
                testContexts.insert(testContexts.end(), new PfTestContext("InvalidLoginLambda", InvalidLoginLambda));
                testContexts.insert(testContexts.end(), new PfTestContext("InvalidRegistration", InvalidRegistration));
                testContexts.insert(testContexts.end(), new PfTestContext("LoginOrRegister", LoginOrRegister));
                testContexts.insert(testContexts.end(), new PfTestContext("LoginWithAdvertisingId", LoginWithAdvertisingId));
                testContexts.insert(testContexts.end(), new PfTestContext("UserDataApi", UserDataApi));
                testContexts.insert(testContexts.end(), new PfTestContext("PlayerStatisticsApi", PlayerStatisticsApi));
                testContexts.insert(testContexts.end(), new PfTestContext("UserCharacter", UserCharacter));
                testContexts.insert(testContexts.end(), new PfTestContext("LeaderBoard", LeaderBoard));
                testContexts.insert(testContexts.end(), new PfTestContext("AccountInfo", AccountInfo));
                testContexts.insert(testContexts.end(), new PfTestContext("CloudScriptLambda", CloudScriptLambda));
                testContexts.insert(testContexts.end(), new PfTestContext("CloudScript", CloudScript));
                testContexts.insert(testContexts.end(), new PfTestContext("CloudScriptError", CloudScriptError));
                testContexts.insert(testContexts.end(), new PfTestContext("WriteEvent", WriteEvent));
            }
        }

        static bool TickTestSuite()
        {
            if (suiteState == COMPLETE)
                return true;
            if (PlayFabSettings::httpRequester->GetPendingCalls() > 0)
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
            if (result && suiteState == ACTIVE)
            {
                suiteState = READY;
                PostTestResultsToCloudScript();
            }
            return result;
        }

        static std::string GenerateSummary()
        {
            if (suiteState == COMPLETE)
                return _outputSummary;

            _outputSummary = "";
            // _outputSummary._Grow(10000, false); Doesn't exist on android *sigh*

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
        static PlayFabApiTestActiveState suiteState;
        static time_t suiteStartTime;
        static std::string _outputSummary; // Basically a temp variable so I don't reallocate this constantly

        static PlayFabSettings* playFabSettings;

        // A bunch of constants loaded from testTitleData.json
        static std::string TEST_TITLE_DATA_LOC;
        static std::string userEmail;
        const static std::string TEST_DATA_KEY;
        const static std::string TEST_STAT_NAME;
        static std::string playFabId;
        static int testMessageInt;
        static time_t testMessageTime;
        static std::list<PfTestContext*> testContexts;

        static bool ClassSetup()
        {
            // README:
            // Create an environment variable PF_TEST_TITLE_DATA_JSON, and set it to the location of a valid testTitleData.json file
            // The format of this file is described in the sdk readme
            //  - OR -
            // Comment the "return false;" below, and
            //   Fill in all the variables under: POPULATE THIS SECTION WITH REAL INFORMATION

#if (CC_TARGET_PLATFORM == CC_PLATFORM_WIN32) // Env vars are only available on Win32
            // Prefer to load path from environment variable, if present
            char* envPath = nullptr;
            size_t envPathStrLen;
            errno_t err = _dupenv_s(&envPath, &envPathStrLen, "PF_TEST_TITLE_DATA_JSON");
            if (err == 0)
                TEST_TITLE_DATA_LOC = envPath; // If exists, reset path to env var
            free(envPath); // It's OK to call free with NULL
#endif

            std::ifstream titleInput;
            titleInput.open(TEST_TITLE_DATA_LOC, std::ios::binary | std::ios::in);
            if (titleInput)
            {
                auto begin = titleInput.tellg();
                titleInput.seekg(0, std::ios::end);
                auto end = titleInput.tellg();
                int size = static_cast<int>(end - begin);
                char* titleJson = new char[size + 1];
                titleInput.seekg(0, std::ios::beg);
                titleInput.read(titleJson, size);
                titleJson[size] = '\0';

                Document testInputs;
                testInputs.Parse<0>(titleJson);
                SetTitleInfo(testInputs);

                titleInput.close();
            }
            else
            {
                return false;
                // TODO: POPULATE THIS SECTION WITH REAL INFORMATION (or set up a testTitleData file, and set your PF_TEST_TITLE_DATA_JSON to the path for that file)
                playFabSettings->titleId = ""; // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
                userEmail = ""; // This is the email for a valid user (test tries to log into it with an invalid password, and verifies error result)
            }

            // Verify all the inputs won't cause crashes in the tests
            return !playFabSettings->titleId.empty()
                && !userEmail.empty();
        }

        static void PostTestResultsToCloudScript()
        {
            // Construct the test results - The expected format is a list of TestSuiteReports, but this framework only submits one, hence the testReport[0] everywhere 
            CsSaveRequest saveRequest;
            saveRequest.customId = PlayFabSettings::buildIdentifier;
            saveRequest.testReport[0].name = PlayFabSettings::buildIdentifier;
            saveRequest.testReport[0].timestamp = clock();
            saveRequest.testReport[0].time = static_cast<double>(saveRequest.testReport[0].timestamp - suiteStartTime) / CLOCKS_PER_SEC;

            for (auto it = testContexts.begin(); it != testContexts.end(); ++it)
            {
                switch ((*it)->finishState)
                {
                case PASSED:
                    saveRequest.testReport[0].passed++; break;
                case FAILED:
                    saveRequest.testReport[0].failures++; break;
                default:
                    saveRequest.testReport[0].skipped++; break;
                }

                TestCaseReport* eachTest = new TestCaseReport();
                eachTest->classname = PlayFabSettings::buildIdentifier;
                eachTest->name = (*it)->testName;
                eachTest->time = static_cast<double>((*it)->endTime - (*it)->startTime) / CLOCKS_PER_SEC;
                eachTest->message = (*it)->testResultMsg;
                eachTest->failureText = PlayFabApiTestFinishState_ToString((*it)->finishState);
                eachTest->finishState = (*it)->finishState;
                saveRequest.testReport[0].testResults.push_back(eachTest);
            }

            // Save the test results to Cloud Script
            ExecuteCloudScriptRequest request;
            request.FunctionName = "SaveTestData";
            request.FunctionParameter = &saveRequest;
            request.GeneratePlayStreamEvent = true;
            PlayFabClientAPI::ExecuteCloudScript(request, OnPostResultsToCloudScript, OnPostResultsError);
        }
        static void OnPostResultsToCloudScript(const ExecuteCloudScriptResult& result, void* customData)
        {
            bool success = result.Error == nullptr;
            GenerateSummary();

            if (success)
                _outputSummary += "\nTest report submitted to Cloud Script: " + PlayFabSettings::buildIdentifier + ", " + playFabId;
            else
                _outputSummary += "\nFailed to submit to Cloud Script:\n" + result.Error->Error + ": " + result.Error->Message;
            //for (auto it = result.Logs.begin(); it != result.Logs.end(); ++it)
            //    _outputSummary += "\n" + (*it).Message;

            suiteState = COMPLETE;
        }
        static void OnPostResultsError(const PlayFabError& error, void* customData)
        {
            GenerateSummary();
            _outputSummary += "\nFailed to submit to Cloud Script: " + error.GenerateErrorReport();
            suiteState = COMPLETE;
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
                && (now - testContext.startTime) < 3000) // Not timed out
                return;

            testContext.endTime = now;
            testContext.activeState = COMPLETE;
        }

        // This should be called in the api-responses, which are threaded.  This will allow TickTest to finalize the test
        static void EndTest(PfTestContext& testContext, PlayFabApiTestFinishState finishState, std::string resultMsg)
        {
            testContext.testResultMsg = resultMsg;
            testContext.finishState = finishState;
            testContext.activeState = READY;
        }

        static void OnSharedError(const PlayFabError& error, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            EndTest(*testContext, FAILED, "Unexpected error: " + error.GenerateErrorReport());
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        static void InvalidLogin(PfTestContext& testContext)
        {
            LoginWithEmailAddressRequest request;
            request.Email = userEmail;
            request.Password = "INVALID";
            PlayFabClientAPI::LoginWithEmailAddress(request, InvalidLoginSuccess, InvalidLoginFail, &testContext);
        }
        static void InvalidLoginSuccess(const LoginResult& result, void* customData)
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
        /// Test that a lambda error callback can be successfully invoked
        /// </summary>
        static void InvalidLoginLambda(PfTestContext& testContext)
        {
            LoginWithEmailAddressRequest request;
            request.Email = userEmail;
            request.Password = "INVALID";

            PlayFabClientAPI::LoginWithEmailAddress(request, nullptr, [](const PlayFabError& error, void* customData) { PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData); EndTest(*testContext, PASSED, ""); }, &testContext);
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a user with an invalid email and password
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        static void InvalidRegistration(PfTestContext& testContext)
        {
            RegisterPlayFabUserRequest request;
            request.Username = "x";
            request.Email = "x";
            request.Password = "x";
            PlayFabClientAPI::RegisterPlayFabUser(request, InvalidRegistrationSuccess, InvalidRegistrationFail, &testContext);
        }
        static void InvalidRegistrationSuccess(const RegisterPlayFabUserResult& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            EndTest(*testContext, FAILED, "Expected registration to fail");
        }
        static void InvalidRegistrationFail(const PlayFabError& error, void* customData)
        {
            bool foundEmailMsg, foundPasswordMsg;
            std::string expectedEmailMsg = "Email address is not valid.";
            std::string expectedPasswordMsg = "Password must be between";
            std::string errorConcat;

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
            LoginWithCustomIDRequest request;
            request.CustomId = PlayFabSettings::buildIdentifier;
            request.CreateAccount = true;
            PlayFabClientAPI::LoginWithCustomID(request, OnLoginOrRegister, OnSharedError, &testContext);
        }
        static void OnLoginOrRegister(const LoginResult& result, void* customData)
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
            playFabSettings->advertisingIdType = playFabSettings->AD_TYPE_ANDROID_ID;
            playFabSettings->advertisingIdValue = "PlayFabTestId";

            LoginWithCustomIDRequest request;
            request.CustomId = PlayFabSettings::buildIdentifier;
            request.CreateAccount = true;
            PlayFabClientAPI::LoginWithCustomID(request, OnLoginWithAdvertisingId, OnSharedError, &testContext);
        }
        static void OnLoginWithAdvertisingId(const LoginResult& result, void* customData)
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

            GetUserDataRequest request;
            PlayFabClientAPI::GetUserData(request, OnUserDataApiGet1, OnSharedError, &testContext);
        }
        static void OnUserDataApiGet1(const GetUserDataResult& result, void* customData)
        {
            auto it = result.Data.find(TEST_DATA_KEY);
            testMessageInt = (it == result.Data.end()) ? 1 : atoi(it->second.Value.c_str());
            // testMessageTime = it->second.LastUpdated; // Don't need the first time

            testMessageInt = (testMessageInt + 1) % 100;
            UpdateUserDataRequest updateRequest;

            // itoa is not avaialable in android
            char buffer[16];
            std::string temp;
            sprintf(buffer, "%d", testMessageInt);
            temp.append(buffer);

            updateRequest.Data[TEST_DATA_KEY] = temp;
            PlayFabClientAPI::UpdateUserData(updateRequest, OnUserDataApiUpdate, OnSharedError, customData);
        }
        static void OnUserDataApiUpdate(const UpdateUserDataResult& result, void* customData)
        {
            GetUserDataRequest request;
            PlayFabClientAPI::GetUserData(request, OnUserDataApiGet2, OnSharedError, customData);
        }
        static void OnUserDataApiGet2(const GetUserDataResult& result, void* customData)
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
            if (!PlayFabClientAPI::IsClientLoggedIn())
            {
                EndTest(testContext, SKIPPED, "Earlier tests failed to log in");
                return;
            }

            GetPlayerStatisticsRequest request;
            PlayFabClientAPI::GetPlayerStatistics(request, OnPlayerStatisticsApiGet1, OnSharedError, &testContext);
        }
        static void OnPlayerStatisticsApiGet1(const GetPlayerStatisticsResult& result, void* customData)
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
            PlayFabClientAPI::UpdatePlayerStatistics(updateRequest, OnPlayerStatisticsApiUpdate, OnSharedError, customData);
        }
        static void OnPlayerStatisticsApiUpdate(const UpdatePlayerStatisticsResult& result, void* customData)
        {
            GetPlayerStatisticsRequest request;
            PlayFabClientAPI::GetPlayerStatistics(request, OnPlayerStatisticsApiGet2, OnSharedError, customData);
        }
        static void OnPlayerStatisticsApiGet2(const GetPlayerStatisticsResult& result, void* customData)
        {
            int actualStatValue = -1000; // A value that is never expected to appear
            for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
                if (it->StatisticName == TEST_STAT_NAME)
                    actualStatValue = it->Value;

            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            if (actualStatValue == -1000)
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
            ListUsersCharactersRequest request;
            PlayFabClientAPI::GetAllUsersCharacters(request, OnUserCharacter, OnSharedError, &testContext);
        }
        static void OnUserCharacter(const ListUsersCharactersResult& result, void* customData)
        {
            // We aren't adding a character to this account, so there's nothing really to test here
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            EndTest(*testContext, PASSED, "");
        }

        /// <summary>
        /// CLIENT API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        static void LeaderBoard(PfTestContext& testContext)
        {
            testMessageInt = 0;
            GetLeaderboardRequest clientRequest;
            clientRequest.MaxResultsCount = 3;
            clientRequest.StatisticName = TEST_STAT_NAME;
            PlayFabClientAPI::GetLeaderboard(clientRequest, OnClientLeaderBoard, OnSharedError, &testContext);
        }
        static void OnClientLeaderBoard(const GetLeaderboardResult& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            if (result.Leaderboard.size() > 0) // We added too many users and stats to test for a specific user, so we just have to test for "any number of results" now
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
            GetAccountInfoRequest request;
            PlayFabClientAPI::GetAccountInfo(request, OnAccountInfo, OnSharedError, &testContext);
        }
        static void OnAccountInfo(const GetAccountInfoResult& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            // Enums-by-name can't really be tested in C++, the way they can in other languages
            if (result.AccountInfo == nullptr || result.AccountInfo->TitleInfo == nullptr || result.AccountInfo->TitleInfo->Origination.isNull())
                EndTest(*testContext, FAILED, "The Origination data is not present to test");
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
            ExecuteCloudScriptRequest request;
            request.FunctionName = "helloWorld";
            PlayFabClientAPI::ExecuteCloudScript(request, OnHelloWorldCloudScript, OnSharedError, &testContext);
        }
        static void OnHelloWorldCloudScript(const ExecuteCloudScriptResult& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            std::string cloudScriptLogReport = "";
            if (result.Error != nullptr)
                cloudScriptLogReport = result.Error->Error + ": " + result.Error->Message;
            for (auto it = result.Logs.begin(); it != result.Logs.end(); ++it)
                cloudScriptLogReport += "\n" + (*it).Message;

            bool success = (cloudScriptLogReport.find("Hello " + playFabId + "!") != -1);
            if (!success)
                EndTest(*testContext, FAILED, cloudScriptLogReport);
            else
                EndTest(*testContext, PASSED, "");
        }

        /// <summary>
        /// CLIENT API
        /// Test that a lambda success callback can be successfully invoked
        /// </summary>
        static void CloudScriptLambda(PfTestContext& testContext)
        {
            ExecuteCloudScriptRequest hwRequest;
            hwRequest.FunctionName = "helloWorld";
            PlayFabClientAPI::ExecuteCloudScript(hwRequest, [](const ExecuteCloudScriptResult& constResult, void* customData) { OnHelloWorldCloudScript(constResult, customData); }, OnSharedError, &testContext);
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript errors can be deciphered
        /// </summary>
        static void CloudScriptError(PfTestContext& testContext)
        {
            ExecuteCloudScriptRequest request;
            request.FunctionName = "throwError";
            PlayFabClientAPI::ExecuteCloudScript(request, OnCloudScriptError, OnSharedError, &testContext);
        }
        static void OnCloudScriptError(const ExecuteCloudScriptResult& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            bool success = true;
            success &= result.FunctionResult == nullptr;
            success &= result.Error != nullptr;
            success &= result.Error->Error.compare("JavascriptException") == 0;
            if (!success)
                EndTest(*testContext, FAILED, "Expected Cloud Script error was not present.");
            else
                EndTest(*testContext, PASSED, "");
        }

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        static void WriteEvent(PfTestContext& testContext)
        {
            WriteClientPlayerEventRequest request;
            request.EventName = "ForumPostEvent";
            request.Timestamp = time(nullptr);
            request.Body["Subject"] = "My First Post";
            request.Body["Body"] = "My awesome post.";
            PlayFabClientAPI::WritePlayerEvent(request, OnWritePlayerEvent, OnSharedError, &testContext);
        }
        static void OnWritePlayerEvent(const WriteEventResponse& result, void* customData)
        {
            PfTestContext* testContext = reinterpret_cast<PfTestContext*>(customData);
            EndTest(*testContext, PASSED, "");
        }
    };
    // C++ Static vars
    PlayFabApiTestActiveState PlayFabApiTests::suiteState;
    time_t PlayFabApiTests::suiteStartTime;
    std::string PlayFabApiTests::_outputSummary;
    PlayFabSettings* PlayFabApiTests::playFabSettings;
    std::string PlayFabApiTests::TEST_TITLE_DATA_LOC = "testTitleData.json"; // default to local file if PF_TEST_TITLE_DATA_JSON env-var does not exist
    std::string PlayFabApiTests::userEmail;
    const std::string PlayFabApiTests::TEST_DATA_KEY = "testCounter";
    const std::string PlayFabApiTests::TEST_STAT_NAME = "str";
    std::list<PfTestContext*> PlayFabApiTests::testContexts;
    std::string PlayFabApiTests::playFabId;
    int PlayFabApiTests::testMessageInt;
    time_t PlayFabApiTests::testMessageTime;
}
