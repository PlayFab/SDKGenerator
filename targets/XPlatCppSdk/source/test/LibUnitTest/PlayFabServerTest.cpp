#include <stdafx.h>

#ifdef ENABLE_PLAYFABSERVER_API

#include <fstream>
#include <CppUnitTest.h>
#include <stdlib.h> // _dupenv_s
#include <Windows.h> // Sleep()

#include <playfab/PlayFabJsonHeaders.h>

#include <playfab/PlayFabServerDataModels.h>
#include <playfab/PlayFabServerApi.h>
#include <playfab/PlayFabSettings.h>

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace PlayFab;
using namespace ServerModels;

namespace UnittestRunner
{
    TEST_CLASS(PlayFabServerTest)
    {
        static bool TITLE_INFO_SET;
        static string TEST_TITLE_DATA_LOC;
        static string testMessageReturn;

    public:
        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        static void SetTitleInfo(Json::Value titleData)
        {
            TITLE_INFO_SET = true;

            // Parse all the inputs
            PlayFabSettings::titleId = titleData["titleId"].asString();
            PlayFabSettings::developerSecretKey = titleData["developerSecretKey"].asString();

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET = true;
        }

        TEST_CLASS_INITIALIZE(ClassInitialize)
        {
            if (TITLE_INFO_SET)
                return;

            // Prefer to load path from environment variable, if present
            char* envPath = nullptr;
            size_t envPathStrLen;
            errno_t err = _dupenv_s(&envPath, &envPathStrLen, "PF_TEST_TITLE_DATA_JSON");
            if (err == 0 && envPath != nullptr)
                TEST_TITLE_DATA_LOC = envPath;
            if (envPath != nullptr)
                free(envPath);

            ifstream titleInput;
            if (TEST_TITLE_DATA_LOC.length() > 0)
                titleInput.open(TEST_TITLE_DATA_LOC, ios::binary | ios::in);
            if (titleInput)
            {
                const auto begin = titleInput.tellg();
                titleInput.seekg(0, ios::end);
                const auto end = titleInput.tellg();
                const int size = static_cast<int>(end - begin);
                char* titleJson = new char[size + 1];
                titleInput.seekg(0, ios::beg);
                titleInput.read(titleJson, size);
                titleJson[size] = '\0';

                Json::CharReaderBuilder jsonReaderFactory;
                Json::CharReader* jsonReader(jsonReaderFactory.newCharReader());
                JSONCPP_STRING jsonParseErrors;
                Json::Value titleData;
                const bool parsedSuccessfully = jsonReader->parse(titleJson, titleJson + size + 1, &titleData, &jsonParseErrors);
                if (parsedSuccessfully)
                    SetTitleInfo(titleData);

                delete[] titleJson;
            }
            else
            {
                // TODO: POPULATE THIS SECTION WITH REAL INFORMATION (or set up a testTitleData file, and set your PF_TEST_TITLE_DATA_JSON to the path for that file)
                PlayFabSettings::titleId = ""; // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            }
        }
        TEST_CLASS_CLEANUP(ClassCleanup)
        {
            PlayFabServerAPI::ForgetAllCredentials();
        }

        static void PlayFabApiWait()
        {
            testMessageReturn = "pending";
            size_t count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabServerAPI::Update();
                sleepCount++;
                Sleep(1);
            }
            // Assert::IsTrue(sleepCount < 20); // The API call shouldn't take too long
        }

        // A shared failure function for all calls (That don't expect failure)
        static void SharedFailedCallback(const PlayFabError& error, void*)
        {
            testMessageReturn.clear();
            testMessageReturn.reserve(1024);
            testMessageReturn = "API_Call_Failed for: ";
            testMessageReturn += error.UrlPath;
            testMessageReturn += "\n";
            testMessageReturn += error.GenerateErrorReport();
            testMessageReturn += "\n";
            testMessageReturn += error.Request.toStyledString();
        }

        /// <summary>
        /// SERVER API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        TEST_METHOD(ServerCloudScript)
        {
            ExecuteCloudScriptServerRequest hwRequest;
            hwRequest.FunctionName = "helloWorld";
            const string playFabId = hwRequest.PlayFabId = "1337D00D";
            PlayFabServerAPI::ExecuteCloudScript(hwRequest, CloudHelloWorldCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();

            const bool success = (testMessageReturn.find("Hello " + playFabId + "!") != -1);
            Assert::IsTrue(success, U(testMessageReturn).c_str());
        }
        static void CloudHelloWorldCallback(const ExecuteCloudScriptResult& constResult, void*)
        {
            ExecuteCloudScriptResult result = constResult; // Some Json::Value syntax is unavailable for const objects, and there's just no way around it
            if (result.FunctionResult.isNull())
                testMessageReturn = "Cloud Decode Failure";
            else if (!result.Error.isNull())
                testMessageReturn = result.Error->Message;
            else
                testMessageReturn = result.FunctionResult["messageValue"].asString();
        }
    };

    bool PlayFabServerTest::TITLE_INFO_SET = false;

    // default to local file if PF_TEST_TITLE_DATA_JSON env-var does not exist
    string PlayFabServerTest::TEST_TITLE_DATA_LOC = "testTitleData.json";

    // Variables for specific tests
    string PlayFabServerTest::testMessageReturn;
}

#endif
