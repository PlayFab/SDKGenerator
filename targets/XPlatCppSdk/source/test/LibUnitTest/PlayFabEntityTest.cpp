#include <stdafx.h>

#if defined(ENABLE_PLAYFABENTITY_API) && !defined(DISABLE_PLAYFABCLIENT_API)

#include <fstream>
#include <CppUnitTest.h>
#include <stdlib.h> // _dupenv_s
#include <Windows.h> // Sleep()

#include <playfab/PlayFabJsonHeaders.h>

#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabEntityDataModels.h>
#include <playfab/PlayFabEntityApi.h>
#include <playfab/PlayFabSettings.h>

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace PlayFab;
using namespace ClientModels;
using namespace EntityModels;

namespace UnittestRunner
{
    TEST_CLASS(PlayFabEntityTest)
    {
        static bool TITLE_INFO_SET;
        static string TEST_TITLE_DATA_LOC;
        static int testMessageInt1;
        static int testMessageInt2;
        static string testMessageReturn;
        static string entityToken;
        static EntityModels::EntityKey entityKey;
        static int testInteger;

        static const string TEST_OBJ_NAME;

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
            PlayFabEntityAPI::ForgetAllCredentials();
        }

        static void PlayFabApiWait()
        {
            testMessageReturn = "pending";
            size_t count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabEntityAPI::Update();
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
            testMessageReturn += error.GenerateReport();
            testMessageReturn += "\n";
            testMessageReturn += error.Request.toStyledString();
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        TEST_METHOD(LoginClient)
        {
            if (PlayFabClientAPI::IsClientLoggedIn())
                return; // This test has to have passed at least once for this case to happen

            LoginWithCustomIDRequest loginRequest;
            loginRequest.CustomId = PlayFabSettings::buildIdentifier;
            loginRequest.CreateAccount = true;

            PlayFabClientAPI::LoginWithCustomID(loginRequest, nullptr, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(PlayFabClientAPI::IsClientLoggedIn());
        }

        /// <summary>
        /// ENTITY API
        /// Verify that a client login can be converted into an entity token
        /// </summary>
        TEST_METHOD(GetEntityToken)
        {
            LoginClient();

            GetEntityTokenRequest request;
            PlayFabEntityAPI::GetEntityToken(request, GetEntityTokenCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();

            Assert::IsTrue(testMessageReturn.compare("Entity Token Received") == 0, U(testMessageReturn).c_str()); // We got the entity token
            Assert::IsTrue(entityKey.TypeString.compare("title_player_account") == 0, U("EntityType: " + entityKey.TypeString).c_str()); // We got the entity token for the type we expected
            Assert::IsTrue(entityToken.length() > 0, U("Title-Player Entity Token not retrieved from GetEntityToken").c_str());
            Assert::IsTrue(entityKey.Id.length() > 0, U("Title-Player EntityId not retrieved from GetEntityToken").c_str());
        }
        static void GetEntityTokenCallback(const GetEntityTokenResponse& result, void*)
        {
            testMessageReturn = "Entity Token Received";
            entityToken = result.EntityToken;

            // It's unfortunate that we have to specify the internal structure of EntityType here...
            entityKey.Id = result.Entity->Id;
            entityKey.Type = result.Entity->Type;
            entityKey.TypeString = result.Entity->TypeString;
        }

        /// <summary>
        /// ENTITY API
        /// Test a sequence of calls that modifies entity objects,
        ///   and verifies that the next sequential API call contains updated information.
        /// Verify that the object is correctly modified on the next call.
        /// </summary>
        TEST_METHOD(ObjectApi)
        {
            GetEntityToken();

            GetObjectsRequest getRequest;
            getRequest.Entity = entityKey;
            PlayFabEntityAPI::GetObjects(getRequest, GetObjectsCallback1, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetObj1 Success") == 0, U(testMessageReturn).c_str());

            SetObjectsRequest setRequest;
            setRequest.Entity = entityKey;
            SetObject setObj;
            setObj.DataObject = testMessageInt1;
            setObj.ObjectName = TEST_OBJ_NAME;
            setRequest.Objects.push_back(setObj);
            PlayFabEntityAPI::SetObjects(setRequest, SetObjectsCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateObj Success") == 0, U(testMessageReturn).c_str());

            PlayFabEntityAPI::GetObjects(getRequest, GetObjectsCallback2, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetObj2 Success") == 0, U(testMessageReturn).c_str());

            Assert::IsTrue(testMessageInt1 == testMessageInt2);
        }
        static void GetObjectsCallback1(const GetObjectsResponse& result, void*)
        {
            testMessageInt1 = 0; // Expected Value
            for (auto it = result.Objects.begin(); it != result.Objects.end(); ++it)
                if (it->first.compare(TEST_OBJ_NAME) == 0)
                    testMessageInt1 = atoi(it->second.EscapedDataObject.c_str());
            testMessageReturn = "GetObj1 Success";
        }
        static void SetObjectsCallback(const SetObjectsResponse& /* result */, void*)
        {
            testMessageReturn = "UpdateObj Success";
        }
        static void GetObjectsCallback2(const GetObjectsResponse& result, void*)
        {
            testMessageInt2 = -1000; // Actual Value
            testMessageReturn = "GetObj2 Failed";
            for (auto it = result.Objects.begin(); it != result.Objects.end(); ++it)
            {
                if (it->first.compare(TEST_OBJ_NAME) == 0)
                {
                    testMessageInt2 = atoi(it->second.EscapedDataObject.c_str());
                    testMessageReturn = "GetObj2 Success";
                }
            }
        }
    };

    bool PlayFabEntityTest::TITLE_INFO_SET = false;

    // default to local file if PF_TEST_TITLE_DATA_JSON env-var does not exist
    string PlayFabEntityTest::TEST_TITLE_DATA_LOC = "testTitleData.json";

    // Variables for specific tests
    int PlayFabEntityTest::testMessageInt1;
    int PlayFabEntityTest::testMessageInt2;
    string PlayFabEntityTest::testMessageReturn;
    string PlayFabEntityTest::entityToken;
    EntityModels::EntityKey PlayFabEntityTest::entityKey;

    const string PlayFabEntityTest::TEST_OBJ_NAME = "testCounter";
}

#endif
