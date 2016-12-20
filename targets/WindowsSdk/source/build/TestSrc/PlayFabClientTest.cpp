#ifndef DISABLE_PLAYFABCLIENT_API

#include "CppUnitTest.h"
#include <stdlib.h> // _dupenv_s
#include <Windows.h> // Sleep()

#include "playfab/PlayFabClientDataModels.h"
#include "playfab/PlayFabClientApi.h"
#include "playfab/PlayFabSettings.h"

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace PlayFab;
using namespace ClientModels;

namespace UnittestRunner
{
    TEST_CLASS(PlayFabClientTest)
    {
        // Functional
        static bool TITLE_INFO_SET;

        // Fixed values provided from testInputs
        static string USER_EMAIL;

        // Information fetched by appropriate API calls
        static string playFabId;

        static const int TEST_STAT_BASE;
        static const string TEST_STAT_NAME;
        static string TEST_TITLE_DATA_LOC;
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
        static void SetTitleInfo(web::json::value titleData)
        {
            // Parse all the inputs
            PlayFabSettings::titleId = titleData[U("titleId")].as_string();
            USER_EMAIL = ShortenString(titleData[U("userEmail")].as_string());

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
            if (err == 0)
                TEST_TITLE_DATA_LOC = envPath;
            free(envPath); // It's OK to call free with NULL

            ifstream titleInput;
            titleInput.open(TEST_TITLE_DATA_LOC, ios::binary | ios::in);
            if (titleInput)
            {
                auto begin = titleInput.tellg();
                titleInput.seekg(0, ios::end);
                auto end = titleInput.tellg();
                int size = static_cast<int>(end - begin);
                char* titleJson = new char[size + 1];
                titleInput.seekg(0, ios::beg);
                titleInput.read(titleJson, size);
                titleJson[size] = '\0';

                auto titleData = web::json::value::parse(WidenString(titleJson));
                SetTitleInfo(titleData);

                delete[] titleJson;
            }
            else
            {
                // TODO: POPULATE THIS SECTION WITH REAL INFORMATION (or set up a testTitleData file, and set your PF_TEST_TITLE_DATA_JSON to the path for that file)
                PlayFabSettings::titleId = U(""); // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
                USER_EMAIL = ""; // This is the email for a valid user (test tries to log into it with an invalid password, and verifies error result)
            }
        }
        TEST_CLASS_CLEANUP(ClassCleanup)
        {
        }

        static void PlayFabApiWait()
        {
            testMessageReturn = "pending";
            size_t count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabClientAPI::Update();
                sleepCount++;
                Sleep(1);
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
            testMessageReturn += ShortenString(error.Request.serialize());
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        TEST_METHOD(InvalidLogin)
        {
            LoginWithEmailAddressRequest request;
            request.Email = USER_EMAIL;
            request.Password = "INVALID";

            PlayFabClientAPI::LoginWithEmailAddress(request, LoginCallback, LoginFailedCallback, nullptr);
            PlayFabApiWait();

            Assert::IsTrue(testMessageReturn.compare("InvalidLogin - Password correctly reported") == 0, WidenString(testMessageReturn).c_str()); // This call is supposed to return as an error
        }
        static void LoginCallback(const LoginResult& result, void* customData)
        {
            testMessageReturn = "Login_Success";
            playFabId = result.PlayFabId; // Successful login tracks playFabId
        }
        static void LoginFailedCallback(const PlayFabError& error, void* customData)
        {
            if (error.ErrorMessage.find("password") != string::npos)
                testMessageReturn = "InvalidLogin - Password correctly reported";
            else
                SharedFailedCallback(error, customData);
        }

        /// <summary>
        /// CLIENT API
        /// Test that a lambda error callback can be successfully invoked
        /// </summary>
        TEST_METHOD(InvalidLoginLambda)
        {
            LoginWithEmailAddressRequest request;
            request.Email = USER_EMAIL;
            request.Password = "INVALID";

            PlayFabClientAPI::LoginWithEmailAddress(request, LoginCallback, [](const PlayFabError& error, void* customData) { testMessageReturn = "Lambda failure success"; }, nullptr);
            PlayFabApiWait();

            Assert::IsTrue(testMessageReturn.compare("Lambda failure success") == 0, WidenString(testMessageReturn).c_str()); // This call is supposed to return as an error
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a user with an invalid email and password
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        TEST_METHOD(InvalidRegistration)
        {
            RegisterPlayFabUserRequest request;
            request.Username = "x";
            request.Email = "x";
            request.Password = "x";
            PlayFabClientAPI::RegisterPlayFabUser(request, InvalidRegistrationSuccess, InvalidRegistrationFail, nullptr);
            PlayFabApiWait();

            Assert::IsTrue(testMessageReturn.compare("InvalidRegistration - errorDetails correctly reported") == 0, WidenString(testMessageReturn).c_str()); // This call is supposed to return as an error
        }
        static void InvalidRegistrationSuccess(const RegisterPlayFabUserResult& result, void* customData)
        {
            testMessageReturn = "InvalidRegistration was expected to fail";
        }
        static void InvalidRegistrationFail(const PlayFabError& error, void* customData)
        {
            bool foundEmailMsg, foundPasswordMsg;
            string expectedEmailMsg = "Email address is not valid.";
            string expectedPasswordMsg = "Password must be between";
            string errorConcat = error.GenerateReport();
            foundEmailMsg = (errorConcat.find(expectedEmailMsg) != -1);
            foundPasswordMsg = (errorConcat.find(expectedPasswordMsg) != -1);

            if (foundEmailMsg && foundPasswordMsg)
                testMessageReturn = "InvalidRegistration - errorDetails correctly reported";
            else
                SharedFailedCallback(error, customData);
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        TEST_METHOD(LoginOrRegister)
        {
            if (PlayFabClientAPI::IsClientLoggedIn())
                return; // This test has to have passed at least once for this case to happen

            LoginWithCustomIDRequest loginRequest;
            loginRequest.CustomId = ShortenString(PlayFabSettings::buildIdentifier);
            loginRequest.CreateAccount = true;

            PlayFabClientAPI::LoginWithCustomID(loginRequest, LoginCallback, LoginFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(PlayFabClientAPI::IsClientLoggedIn(), WidenString(testMessageReturn).c_str());
        }

        /// <summary>
        /// CLIENT API
        /// Test that the login call sequence sends the AdvertisingId when set
        /// </summary>
        TEST_METHOD(LoginWithAdvertisingId)
        {
            PlayFabSettings::advertisingIdType = PlayFabSettings::AD_TYPE_ANDROID_ID;
            PlayFabSettings::advertisingIdValue = U("PlayFabTestId");

            LoginWithCustomIDRequest loginRequest;
            loginRequest.CustomId = ShortenString(PlayFabSettings::buildIdentifier);
            loginRequest.CreateAccount = true;

            PlayFabClientAPI::LoginWithCustomID(loginRequest, LoginCallback, LoginFailedCallback, nullptr);
            PlayFabApiWait();

            auto targetValue = PlayFabSettings::AD_TYPE_ANDROID_ID + U("_Successful");
            auto actualValue = PlayFabSettings::advertisingIdType;
            Assert::IsTrue(actualValue.compare(targetValue) == 0, L"Check that advertisingId was sent.");
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, map<string, UserDataRecord>, DateTime
        /// </summary>
        TEST_METHOD(UserDataApi)
        {
            LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

                               // Define some of the containers we use in this test
            GetUserDataRequest getRequest;
            UpdateUserDataRequest updateRequest1, updateRequest2;
            int testCounterValueActual;

            PlayFabClientAPI::GetUserData(getRequest, GetDataCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            int testCounterValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            updateRequest1.Data[TEST_DATA_KEY_1] = to_string(testCounterValueExpected);
            updateRequest1.Data[TEST_DATA_KEY_2] = string("This is trash");
            PlayFabClientAPI::UpdateUserData(updateRequest1, UpdateDataCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateData_Success") == 0, L"Check that UpdateUserData was successful");

            PlayFabClientAPI::GetUserData(getRequest, GetDataCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            testCounterValueActual = testMessageInt;
            Assert::AreEqual(testCounterValueExpected, testCounterValueActual, L"Check that the userData counter was incremented as expected");
            Assert::IsTrue(testMessageBool, L"Check if TEST_DATA_KEY_2 exists"); // TEST_DATA_KEY_2 is created

                                                                                 // Check for, and remove TEST_DATA_KEY_2
            updateRequest2.KeysToRemove.emplace_back(TEST_DATA_KEY_2);
            PlayFabClientAPI::UpdateUserData(updateRequest2, UpdateDataCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateData_Success") == 0, L"Check that UpdateUserData was successful");

            PlayFabClientAPI::GetUserData(getRequest, GetDataCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            Assert::IsFalse(testMessageBool, L"Check if TEST_DATA_KEY_2 is removed"); // TEST_DATA_KEY_2 is removed

            time_t now = time(nullptr);
            struct tm timeInfo;
            gmtime_s(&timeInfo, &now);
            now = mktime(&timeInfo);
            time_t minTime = now - (60 * 5);
            time_t maxTime = now + (60 * 5);
            Assert::IsTrue(minTime <= testMessageTime && testMessageTime <= maxTime);
        }
        static void GetDataCallback(const GetUserDataResult& result, void* customData)
        {
            testMessageReturn = "GetData_Success";
            auto it1 = result.Data.find(TEST_DATA_KEY_1);
            if (it1 != result.Data.end())
            {
                testMessageInt = atoi(it1->second.Value.c_str());
                testMessageTime = it1->second.LastUpdated;
            }
            auto it2 = result.Data.find(TEST_DATA_KEY_2);
            testMessageBool = (it2 != result.Data.end());
        }
        static void UpdateDataCallback(const UpdateUserDataResult& result, void* customData)
        {
            // The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
            testMessageReturn = "UpdateData_Success";
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is saved correctly, and that specific types are tested
        /// Parameter types tested: map<string, Int32>
        /// </summary>
        TEST_METHOD(PlayerStatisticsApi)
        {
            LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

            GetPlayerStatisticsRequest getRequest;
            PlayFabClientAPI::GetPlayerStatistics(getRequest, GetStatsCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0, WidenString(testMessageReturn).c_str());
            Int32 testStatValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            UpdatePlayerStatisticsRequest updateRequest;
            StatisticUpdate statUpdate;
            statUpdate.StatisticName = TEST_STAT_NAME;
            statUpdate.Value = testStatValueExpected;
            updateRequest.Statistics.insert(updateRequest.Statistics.begin(), statUpdate);
            PlayFabClientAPI::UpdatePlayerStatistics(updateRequest, UpdateStatsCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateStats_Success") == 0, WidenString(testMessageReturn).c_str());

            PlayFabClientAPI::GetPlayerStatistics(getRequest, GetStatsCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0, WidenString(testMessageReturn).c_str());
            Int32 testStatValueActual = testMessageInt;

            Assert::AreEqual(testStatValueExpected, testStatValueActual);
        }
        static void GetStatsCallback(const GetPlayerStatisticsResult& result, void* customData)
        {
            bool success = false;
            for (auto it = result.Statistics.begin(); it != result.Statistics.end(); ++it)
            {
                if (it->StatisticName == TEST_STAT_NAME)
                {
                    testMessageInt = it->Value;
                    success = true;
                }
            }
            if (success)
                testMessageReturn = "GetStats_Success";
            else
                testMessageReturn = "Target statistic not found";
        }
        static void UpdateStatsCallback(const UpdatePlayerStatisticsResult& result, void* customData)
        {
            // The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
            testMessageReturn = "UpdateStats_Success";
        }

        /// <summary>
        /// CLIENT API
        /// Get characters is no longer very useful
        /// </summary>
        TEST_METHOD(UserCharacter)
        {
            LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

            ListUsersCharactersRequest request;
            PlayFabClientAPI::GetAllUsersCharacters(request, GetCharsCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetChars_Success") == 0, WidenString(testMessageReturn).c_str());
        }
        static void GetCharsCallback(const ListUsersCharactersResult& result, void* customData)
        {
            testMessageReturn = "GetChars_Success";
        }

        /// <summary>
        /// CLIENT API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        TEST_METHOD(LeaderBoard)
        {
            // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements
            LoginOrRegister();
            PlayerStatisticsApi();

            GetLeaderboardRequest clientRequest;
            clientRequest.MaxResultsCount = 3;
            clientRequest.StatisticName = TEST_STAT_NAME;
            PlayFabClientAPI::GetLeaderboard(clientRequest, ClientLeaderboardCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetClientLB_Success") == 0, WidenString(testMessageReturn).c_str());
            Assert::IsTrue(testMessageInt != 0);
        }
        static void ClientLeaderboardCallback(const GetLeaderboardResult& result, void* customData)
        {
            testMessageReturn = "GetClientLB_Success";
            testMessageInt = result.Leaderboard.size();
        }

        /// <summary>
        /// CLIENT API
        /// Test that AccountInfo can be requested
        /// Parameter types tested: List of enum-as-strings converted to list of enums
        /// </summary>
        TEST_METHOD(AccountInfo)
        {
            LoginOrRegister();

            GetAccountInfoRequest request;
            request.PlayFabId = playFabId;
            PlayFabClientAPI::GetAccountInfo(request, AcctInfoCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("Enums tested") == 0, WidenString(testMessageReturn).c_str());
        }
        static void AcctInfoCallback(const GetAccountInfoResult& result, void* customData)
        {
            if (result.AccountInfo.isNull() || result.AccountInfo->TitleInfo.isNull() || result.AccountInfo->TitleInfo->Origination.isNull())
            {
                testMessageReturn = "Enums not properly tested";
                return;
            }

            auto output = result.AccountInfo->TitleInfo->Origination.mValue; // C++ can't really do anything with this once fetched
            testMessageReturn = "Enums tested";
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        TEST_METHOD(CloudScript)
        {
            LoginOrRegister();

            ExecuteCloudScriptRequest hwRequest;
            hwRequest.FunctionName = "helloWorld";
            PlayFabClientAPI::ExecuteCloudScript(hwRequest, CloudHelloWorldCallback, SharedFailedCallback, nullptr);
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

        /// <summary>
        /// CLIENT API
        /// Test that a lambda success callback can be successfully invoked
        /// </summary>
        TEST_METHOD(CloudScriptLambda)
        {
            LoginOrRegister();

            ExecuteCloudScriptRequest hwRequest;
            hwRequest.FunctionName = "helloWorld";
            PlayFabClientAPI::ExecuteCloudScript(hwRequest, [](const ExecuteCloudScriptResult& constResult, void* customData) { CloudHelloWorldCallback(constResult, customData); }, SharedFailedCallback, nullptr);
            PlayFabApiWait();

            bool success = (testMessageReturn.find("Hello " + playFabId + "!") != -1);
            Assert::IsTrue(success, WidenString(testMessageReturn).c_str());
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript errors can be deciphered
        /// </summary>
        TEST_METHOD(CloudScriptError)
        {
            LoginOrRegister();

            ExecuteCloudScriptRequest errRequest;
            errRequest.FunctionName = "throwError";
            PlayFabClientAPI::ExecuteCloudScript(errRequest, CloudErrorCallback, SharedFailedCallback, nullptr);
            PlayFabApiWait();

            Assert::IsTrue(testMessageReturn.find("JavascriptException") == 0, WidenString(testMessageReturn).c_str());
        }
        static void CloudErrorCallback(const ExecuteCloudScriptResult& result, void* customData)
        {
            testMessageReturn = "";
            if (!result.FunctionResult.is_null())
                testMessageReturn = "FunctionResult was unexpectedly defined.";
            else if (result.Error.isNull())
                testMessageReturn = "Cloud Script error not found.";
            else
                testMessageReturn = result.Error->Error;
        }

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        TEST_METHOD(WriteEvent)
        {
            LoginOrRegister();

            WriteClientPlayerEventRequest request;
            request.EventName = "ForumPostEvent";
            request.Timestamp = time(nullptr);
            request.Body[U("Subject")] = web::json::value::string(WidenString("My First Post"));
            request.Body[U("Body")] = web::json::value::string(WidenString("My awesome post."));
            PlayFabClientAPI::WritePlayerEvent(request, OnWritePlayerEvent, SharedFailedCallback, nullptr);
            PlayFabApiWait();
            Assert::IsTrue(testMessageReturn.compare("WriteEvent tested") == 0, WidenString(testMessageReturn).c_str());
        }
        static void OnWritePlayerEvent(const WriteEventResponse& result, void* customData)
        {
            testMessageReturn = "WriteEvent tested";
        }
    };

    bool PlayFabClientTest::TITLE_INFO_SET = false;

    // Fixed values provided from testInputs
    string PlayFabClientTest::USER_EMAIL;

    // Information fetched by appropriate API calls
    string PlayFabClientTest::playFabId;

    const int PlayFabClientTest::TEST_STAT_BASE = 10;
    const string PlayFabClientTest::TEST_STAT_NAME = "str";
    string PlayFabClientTest::TEST_TITLE_DATA_LOC = "testTitleData.json"; // default to local file if PF_TEST_TITLE_DATA_JSON env-var does not exist
    const string PlayFabClientTest::TEST_DATA_KEY_1 = "testCounter";
    const string PlayFabClientTest::TEST_DATA_KEY_2 = "deleteCounter";

    // Variables for specific tests
    string PlayFabClientTest::testMessageReturn;
    Int32 PlayFabClientTest::testMessageInt;
    time_t PlayFabClientTest::testMessageTime;
    bool PlayFabClientTest::testMessageBool;
}

#endif
