#ifdef ENABLE_PLAYFABSERVER_API

#include "CppUnitTest.h"
#include "playfab/PlayFabServerDataModels.h"
#include "playfab/PlayFabServerApi.h"
#include "playfab/PlayFabSettings.h"

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace PlayFab;
using namespace ServerModels;

namespace UnittestRunner
{
    TEST_CLASS(PlayFabServerTest)
    {
        // Functional
        static bool TITLE_INFO_SET;

        // Fixed values provided from testInputs
        static string USER_EMAIL;

        // Information fetched by appropriate API calls
        static string playFabId;

        static const int TEST_STAT_BASE;
        static const string TEST_STAT_NAME;
        static const string TEST_TITLE_DATA_LOC;
        static const string TEST_DATA_KEY_1;
        static const string TEST_DATA_KEY_2;

        // Variables for specific tests
        static string testMessageReturn;
        static Int32 testMessageInt;
        static time_t testMessageTime;
        static bool testMessageBool;

    public:
        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        static void SetTitleInfo()
        {
            TITLE_INFO_SET = true;

            // Parse all the inputs
            PlayFabSettings::titleId = WidenString("6195");
            PlayFabSettings::developerSecretKey = WidenString("asdf");
            USER_EMAIL = "paul@playfab.com";

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET = true;
        }

        TEST_CLASS_INITIALIZE(ClassInitialize)
        {
            SetTitleInfo();
        }
        TEST_CLASS_CLEANUP(ClassCleanup)
        {
        }

        static void PlayFabApiWait()
        {
            testMessageReturn = "pending";
            int count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabServerAPI::Update();
                sleepCount++;
                _sleep(1);
            }
            // Assert::IsTrue(sleepCount < 20); // The API call shouldn't take too long
        }

        // A shared failure function for all calls (That don't expect failure)
        static void SharedFailedCallback(const PlayFabError& error, void* customData)
        {
            testMessageReturn.clear();
            testMessageReturn._Grow(1024);
            testMessageReturn = "API_Call_Failed for: ";
            testMessageReturn += error.UrlPath;
            testMessageReturn += "\n";
            testMessageReturn += error.GenerateReport();
            testMessageReturn += "\n";
            testMessageReturn += ShortenString(error.Request.to_string());
        }

        /// <summary>
        /// SERVER API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        TEST_METHOD(ServerCloudScript)
        {
            ExecuteCloudScriptServerRequest hwRequest;
            hwRequest.FunctionName = "helloWorld";
            playFabId = hwRequest.PlayFabId = "1337D00D";
            PlayFabServerAPI::ExecuteCloudScript(hwRequest, &CloudHelloWorldCallback, &SharedFailedCallback, nullptr);
            PlayFabApiWait();

            bool success = (testMessageReturn.find("Hello " + playFabId + "!") != -1);
            Assert::IsTrue(success, WidenString(testMessageReturn).c_str());
        }
        static void CloudHelloWorldCallback(const ExecuteCloudScriptResult& constResult, void* customData)
        {
            ExecuteCloudScriptResult result = constResult; // Some web::json::value syntax is unavailable for const objects, and there's just no way around it
            if (result.FunctionResult.is_null())
                testMessageReturn = "Cloud Decode Failure";
            else if (!result.Error.isNull())
                testMessageReturn = result.Error.mValue.Message;
            else
                testMessageReturn = ShortenString(result.FunctionResult[U("messageValue")].as_string());
        }
    };

    bool PlayFabServerTest::TITLE_INFO_SET = false;

    // Fixed values provided from testInputs
    string PlayFabServerTest::USER_EMAIL;

    // Information fetched by appropriate API calls
    string PlayFabServerTest::playFabId;

    const int PlayFabServerTest::TEST_STAT_BASE = 10;
    const string PlayFabServerTest::TEST_STAT_NAME = "str";
    const string PlayFabServerTest::TEST_TITLE_DATA_LOC = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json"; // TODO: Convert hard coded path to a relative path that always works (harder than it sounds when the unittests are run from multiple working directories)
    const string PlayFabServerTest::TEST_DATA_KEY_1 = "testCounter";
    const string PlayFabServerTest::TEST_DATA_KEY_2 = "deleteCounter";

    // Variables for specific tests
    string PlayFabServerTest::testMessageReturn;
    Int32 PlayFabServerTest::testMessageInt;
    time_t PlayFabServerTest::testMessageTime;
    bool PlayFabServerTest::testMessageBool;
}

#endif
