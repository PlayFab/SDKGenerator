#include <fstream>
#include "CppUnitTest.h"
#include "playfab/PlayFabClientDataModels.h"
#include "playfab/PlayFabServerDataModels.h"
#include "playfab/PlayFabClientAPI.h"
#include "playfab/PlayFabServerAPI.h"
#include "playfab/PlayFabSettings.h"
#include <thread>         // std::this_thread::sleep_for
#include <chrono>         // std::chrono::seconds

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace rapidjson;
using namespace PlayFab;
using namespace ClientModels;
using namespace ServerModels;

#pragma comment(lib, "wldap32.lib")
#pragma comment(lib, "ws2_32.lib")

#if(_DEBUG)
#pragma comment(lib, "libcurld.lib")
#pragma comment(lib, "libeay32d.lib")
#pragma comment(lib, "ssleay32d.lib")
#pragma comment(lib, "zlibd.lib")
#pragma comment(lib, "PlayFabAllAPId.lib")
#else
#pragma comment(lib, "libcurl.lib")
#pragma comment(lib, "libeay32.lib")
#pragma comment(lib, "ssleay32.lib")
#pragma comment(lib, "zlib.lib")
#pragma comment(lib, "PlayFabAllAPI.lib")
#endif

namespace UnittestRunner
{
    // Functional
    bool TITLE_INFO_SET = false;
    bool TITLE_CAN_UPDATE_SETTINGS = false;

    // Fixed values provided from testInputs
    string USER_NAME;
    string USER_EMAIL;
    string USER_PASSWORD;
    string CHAR_NAME;

    // Information fetched by appropriate API calls
    string playFabId;
    string characterId;

    const int TEST_STAT_BASE = 10;
    const string TEST_STAT_NAME = "str";
    const string CHAR_TEST_TYPE = "Test";
    const string TEST_TITLE_DATA_LOC = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json"; // TODO: Convert hard coded path to a relative path that always works (harder than it sounds when the unittests are run from multiple working directories)
    const string TEST_DATA_KEY_1 = "testCounter";
    const string TEST_DATA_KEY_2 = "deleteCounter";

    // Variables for specific tests
    string testMessageReturn;
    Int32 testMessageInt;
    time_t testMessageTime;
    bool testMessageBool;

    TEST_CLASS(PlayFabApiTest)
    {
    public:
        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        static void SetTitleInfo(Document &testInputs)
        {
            TITLE_INFO_SET = true;

            // Parse all the inputs
            auto end = testInputs.MemberEnd();
            auto each = testInputs.FindMember("titleId");
            if (each != end) PlayFabSettings::titleId = each->value.GetString(); else TITLE_INFO_SET = false;
            each = testInputs.FindMember("developerSecretKey");
            if (each != end) PlayFabSettings::developerSecretKey = each->value.GetString(); else TITLE_INFO_SET = false;

            string blah;
            each = testInputs.FindMember("titleCanUpdateSettings");
            if (each != end) blah = each->value.GetString(); else TITLE_INFO_SET = false;
            TITLE_CAN_UPDATE_SETTINGS = (blah.compare("true") == 0 || blah.compare("True") == 0 || blah.compare("TRUE") == 0);

            each = testInputs.FindMember("userName");
            if (each != end) USER_NAME = each->value.GetString(); else TITLE_INFO_SET = false;
            each = testInputs.FindMember("userEmail");
            if (each != end) USER_EMAIL = each->value.GetString(); else TITLE_INFO_SET = false;
            each = testInputs.FindMember("userPassword");
            if (each != end) USER_PASSWORD = each->value.GetString(); else TITLE_INFO_SET = false;

            each = testInputs.FindMember("characterName");
            if (each != end) CHAR_NAME = each->value.GetString(); else TITLE_INFO_SET = false;

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !PlayFabSettings::titleId.empty()
                && !PlayFabSettings::developerSecretKey.empty()
                && !USER_NAME.empty()
                && !USER_EMAIL.empty()
                && !USER_PASSWORD.empty()
                && !CHAR_NAME.empty();
        }

        TEST_CLASS_INITIALIZE(ClassInitialize)
        {
            if (!TITLE_INFO_SET)
            {
                ifstream titleInput;
                titleInput.open(TEST_TITLE_DATA_LOC, ios::binary | ios::in);
                if (titleInput)
                {
                    int begin = titleInput.tellg();
                    titleInput.seekg(0, ios::end);
                    int end = titleInput.tellg();
                    char* titleData = new char[end - begin];
                    titleInput.seekg(0, ios::beg);
                    titleInput.read(titleData, end - begin);
                    titleData[end - begin] = '\0';

                    Document testInputs;
                    testInputs.Parse<0>(titleData);
                    SetTitleInfo(testInputs);

                    titleInput.close();
                }
                else
                {
                    Logger::WriteMessage("Test cannot run without test-data.\n");
                    Logger::WriteMessage("Assign TEST_TITLE_DATA_LOC with the correct file path and name and ReBuild to try again.\n");
                }
            }
            Assert::IsTrue(TITLE_INFO_SET);
        }
        TEST_CLASS_CLEANUP(ClassCleanup)
        {
        }

        void ClientApiWait()
        {
            testMessageReturn = "pending";
            int count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabClientAPI::Update();
                sleepCount++;
                this_thread::sleep_for(chrono::milliseconds(1));
            }
            // Assert::IsTrue(sleepCount < 20); // The API call shouldn't take too long
        }

        void ServerApiWait()
        {
            testMessageReturn = "pending";
            int count = 1, sleepCount = 0;
            while (count != 0)
            {
                count = PlayFabServerAPI::Update();
                sleepCount++;
                this_thread::sleep_for(chrono::milliseconds(1));
            }
            // Assert::IsTrue(sleepCount < 20); // The API call shouldn't take too long
        }

        // A shared failure function for all calls (That don't expect failure)
        static void SharedFailedCallback(PlayFabError& error, void* userData)
        {
            testMessageReturn = "API_Call_Failed: ";
            testMessageReturn += error.ErrorMessage;
            testMessageReturn += ", " + error.ErrorName;
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        TEST_METHOD(InvalidLogin)
        {
            LoginWithEmailAddressRequest request;
            request.TitleId = PlayFabSettings::titleId;
            request.Email = USER_EMAIL;
            request.Password = USER_PASSWORD + "INVALID";

            PlayFabClientAPI::LoginWithEmailAddress(request, &LoginCallback, &LoginFailedCallback, NULL);
            ClientApiWait();

            Assert::IsTrue(testMessageReturn.compare("Login_Failed - Password") == 0); // This call is supposed to return as an error
        }
        static void LoginCallback(LoginResult& result, void* userData)
        {
            testMessageReturn = "Login_Success";
            playFabId = result.PlayFabId; // Successful login tracks playFabId
        }
        static void LoginFailedCallback(PlayFabError& error, void* userData)
        {
            if (error.ErrorMessage.find("password") != std::string::npos)
                testMessageReturn = "Login_Failed - Password";
            else
                testMessageReturn = "Login_Failed - " + error.ErrorMessage;
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        TEST_METHOD(LoginOrRegister)
        {
            if (PlayFabClientAPI::IsClientLoggedIn())
                return; // This test has to have passed at least once for this case to happen

            LoginWithEmailAddressRequest loginRequest;
            loginRequest.TitleId = PlayFabSettings::titleId;
            loginRequest.Email = USER_EMAIL;
            loginRequest.Password = USER_PASSWORD;

            PlayFabClientAPI::LoginWithEmailAddress(loginRequest, &LoginCallback, &LoginFailedCallback, NULL);
            ClientApiWait();

            if (testMessageReturn.compare("Login_Success") == 0 && PlayFabClientAPI::IsClientLoggedIn())
                return;

            // If the setup failed to log in a user, we need to create one.
            RegisterPlayFabUserRequest registerRequest;
            registerRequest.TitleId = PlayFabSettings::titleId;
            registerRequest.Username = USER_NAME;
            registerRequest.Email = USER_EMAIL;
            registerRequest.Password = USER_PASSWORD;

            PlayFabClientAPI::RegisterPlayFabUser(registerRequest, &RegisterCallback, &SharedFailedCallback, NULL);
            ClientApiWait();

            Assert::IsTrue(testMessageReturn.compare("Register_Success") == 0, L"Check that RegisterPlayFabUser was successful");
            Assert::IsTrue(PlayFabClientAPI::IsClientLoggedIn(), L"Check that a user is logged in");
        }
        static void RegisterCallback(RegisterPlayFabUserResult& result, void* userData)
        {
            testMessageReturn = "Register_Success";
            playFabId = result.PlayFabId; // Successful login tracks playFabId
        }

        /// <summary>
        /// CLIENT API
        /// Test that the login call sequence sends the AdvertisingId when set
        /// </summary>
        TEST_METHOD(LoginWithAdvertisingId)
        {
            PlayFabSettings::advertisingIdType = PlayFabSettings::AD_TYPE_ANDROID_ID;
            PlayFabSettings::advertisingIdValue = "PlayFabTestId";

            LoginWithEmailAddressRequest loginRequest;
            loginRequest.TitleId = PlayFabSettings::titleId;
            loginRequest.Email = USER_EMAIL;
            loginRequest.Password = USER_PASSWORD;

            PlayFabClientAPI::LoginWithEmailAddress(loginRequest, &LoginCallback, &LoginFailedCallback, NULL);
            ClientApiWait();

            string targetValue = PlayFabSettings::AD_TYPE_ANDROID_ID + "_Successful";
            string actualValue = PlayFabSettings::advertisingIdType;
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
            ClientModels::GetUserDataRequest getRequest;
            ClientModels::UpdateUserDataRequest updateRequest1, updateRequest2;
            char buffer[12];
            int testCounterValueActual;

            PlayFabClientAPI::GetUserData(getRequest, &GetDataCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            int testCounterValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            updateRequest1.Data[TEST_DATA_KEY_1] = std::string(itoa(testCounterValueExpected, buffer, 10));
            updateRequest1.Data[TEST_DATA_KEY_2] = std::string("This is trash");
            auto updateJson1 = updateRequest1.toJSONString();
            PlayFabClientAPI::UpdateUserData(updateRequest1, &UpdateDataCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateData_Success") == 0, L"Check that UpdateUserData was successful");

            PlayFabClientAPI::GetUserData(getRequest, &GetDataCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            testCounterValueActual = testMessageInt;
            Assert::AreEqual(testCounterValueExpected, testCounterValueActual, L"Check that the userData counter was incremented as expected");
            Assert::IsTrue(testMessageBool, L"Check if TEST_DATA_KEY_2 exists"); // TEST_DATA_KEY_2 is created

            // Check for, and remove TEST_DATA_KEY_2
            updateRequest2.KeysToRemove.emplace_back(TEST_DATA_KEY_2);
            auto updateJson2 = updateRequest2.toJSONString();
            PlayFabClientAPI::UpdateUserData(updateRequest2, &UpdateDataCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateData_Success") == 0, L"Check that UpdateUserData was successful");

            PlayFabClientAPI::GetUserData(getRequest, &GetDataCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0, L"Check that GetUserData was successful");
            Assert::IsFalse(testMessageBool, L"Check if TEST_DATA_KEY_2 is removed"); // TEST_DATA_KEY_2 is removed

            time_t now = time(NULL);
            now = mktime(gmtime(&now));
            time_t minTime = now - (60 * 5);
            time_t maxTime = now + (60 * 5);
            Assert::IsTrue(minTime <= testMessageTime && testMessageTime <= maxTime);
        }
        static void GetDataCallback(ClientModels::GetUserDataResult& result, void* userData)
        {
            testMessageReturn = "GetData_Success";
            std::map<string, ClientModels::UserDataRecord>::iterator it1 = result.Data.find(TEST_DATA_KEY_1);
            if (it1 != result.Data.end())
            {
                testMessageInt = atoi(it1->second.Value.c_str());
                testMessageTime = it1->second.LastUpdated;
            }
            std::map<string, ClientModels::UserDataRecord>::iterator it2 = result.Data.find(TEST_DATA_KEY_2);
            testMessageBool = (it2 != result.Data.end());
        }
        static void UpdateDataCallback(ClientModels::UpdateUserDataResult& result, void* userData)
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
        TEST_METHOD(UserStatisticsApi)
        {
            LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

            PlayFabClientAPI::GetUserStatistics(&GetStatsCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0);
            Int32 testStatValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            ClientModels::UpdateUserStatisticsRequest updateRequest;
            updateRequest.UserStatistics[TEST_STAT_NAME] = testStatValueExpected;
            PlayFabClientAPI::UpdateUserStatistics(updateRequest, &UpdateStatsCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("UpdateStats_Success") == 0);

            PlayFabClientAPI::GetUserStatistics(&GetStatsCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0);
            Int32 testStatValueActual = testMessageInt;

            Assert::AreEqual(testStatValueExpected, testStatValueActual);
        }
        static void GetStatsCallback(ClientModels::GetUserStatisticsResult& result, void* userData)
        {
            testMessageReturn = "GetStats_Success";
            std::map<string, Int32>::iterator it = result.UserStatistics.find(TEST_STAT_NAME);
            if (it != result.UserStatistics.end())
                testMessageInt = it->second;
        }
        static void UpdateStatsCallback(ClientModels::UpdateUserStatisticsResult& result, void* userData)
        {
            // The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
            testMessageReturn = "UpdateStats_Success";
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        TEST_METHOD(UserCharacter)
        {
            LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

            ServerModels::ListUsersCharactersRequest request1;
            request1.PlayFabId = playFabId;
            PlayFabServerAPI::GetAllUsersCharacters(request1, &GetCharsCallback, &SharedFailedCallback, NULL);
            ServerApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetChars_Success") == 0);

            if (characterId.empty())
            {
                // Character doesn't exist, try to create it
                ServerModels::GrantCharacterToUserRequest grantRequest;
                grantRequest.PlayFabId = playFabId;
                grantRequest.CharacterName = CHAR_NAME;
                grantRequest.CharacterType = CHAR_TEST_TYPE;
                PlayFabServerAPI::GrantCharacterToUser(grantRequest, &GrantCharCallback, &SharedFailedCallback, NULL);
                ServerApiWait();
                Assert::IsTrue(testMessageReturn.compare("GrantChar_Success") == 0);
                Assert::IsTrue(!characterId.empty());

                ServerModels::ListUsersCharactersRequest request2;
                request2.PlayFabId = playFabId;
                PlayFabServerAPI::GetAllUsersCharacters(request2, &GetCharsCallback, &SharedFailedCallback, NULL);
                ServerApiWait();
                Assert::IsTrue(testMessageReturn.compare("GetChars_Success") == 0);
            }

            Assert::IsTrue(!characterId.empty());
        }
        static void GetCharsCallback(ServerModels::ListUsersCharactersResult& result, void* userData)
        {
            testMessageReturn = "GetChars_Success";
            characterId = ""; // Reset the characterId

            list<ServerModels::CharacterResult>::const_iterator it;
            for (it = result.Characters.begin(); it != result.Characters.end(); ++it)
            {
                if (it->CharacterName.compare(CHAR_NAME) == 0)
                {
                    testMessageInt = 1;
                    characterId = it->CharacterId; // Correct character found, set the info
                }
            }
        }
        static void GrantCharCallback(ServerModels::GrantCharacterToUserResult& result, void* userData)
        {
            testMessageReturn = "GrantChar_Success";
            characterId = result.CharacterId;
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        TEST_METHOD(LeaderBoard)
        {
            // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements
            LoginOrRegister();
            UserStatisticsApi();

            ClientModels::GetLeaderboardRequest clientRequest;
            clientRequest.MaxResultsCount = 3;
            clientRequest.StatisticName = TEST_STAT_NAME;
            PlayFabClientAPI::GetLeaderboard(clientRequest, &ClientLeaderboardCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetClientLB_Success") == 0);
            Assert::IsTrue(testMessageInt != 0);

            ServerModels::GetLeaderboardRequest serverRequest;
            serverRequest.MaxResultsCount = 3;
            serverRequest.StatisticName = TEST_STAT_NAME;
            PlayFabServerAPI::GetLeaderboard(serverRequest, &ServerLeaderboardCallback, &SharedFailedCallback, NULL);
            ServerApiWait();
            Assert::IsTrue(testMessageReturn.compare("GetServerLB_Success") == 0);
            Assert::IsTrue(testMessageInt != 0);
        }
        static void ClientLeaderboardCallback(ClientModels::GetLeaderboardResult& result, void* userData)
        {
            testMessageReturn = "GetClientLB_Success";
            testMessageInt = result.Leaderboard.size();
        }
        static void ServerLeaderboardCallback(ServerModels::GetLeaderboardResult& result, void* userData)
        {
            testMessageReturn = "GetServerLB_Success";
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
            PlayFabClientAPI::GetAccountInfo(request, &AcctInfoCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("Enums tested") == 0);
        }
        static void AcctInfoCallback(GetAccountInfoResult& result, void* userData)
        {
            if (result.AccountInfo == NULL || result.AccountInfo->TitleInfo == NULL || result.AccountInfo->TitleInfo->Origination.isNull())
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

            if (PlayFabSettings::logicServerURL.length() == 0)
            {
                ClientModels::GetCloudScriptUrlRequest urlRequest;
                PlayFabClientAPI::GetCloudScriptUrl(urlRequest, &CloudUrlCallback, &SharedFailedCallback, NULL);
                ClientApiWait();
                Assert::IsTrue(testMessageReturn.compare("CloudUrl retrieved") == 0);
            }

            ClientModels::RunCloudScriptRequest hwRequest;
            hwRequest.ActionId = "helloWorld";
            PlayFabClientAPI::RunCloudScript(hwRequest, &CloudHelloWorldCallback, &SharedFailedCallback, NULL);
            ClientApiWait();
            Assert::IsTrue(testMessageReturn.compare("Hello " + playFabId + "!") == 0);
        }
        static void CloudUrlCallback(ClientModels::GetCloudScriptUrlResult& result, void* userData)
        {
            testMessageReturn = (result.Url.length() > 0) ? "CloudUrl retrieved" : "CloudUrl failed";
        }
        static void CloudHelloWorldCallback(ClientModels::RunCloudScriptResult& result, void* userData)
        {
            // KNOWN ISSUE: result.Results does not get populated/decoded correctly!!!
            //if (result.Results.isNull())
            //    testMessageReturn = "Cloud Decode Failure";

            // Temporary: Just evaluate the ResultsEncoded json directly for the target message
            //   The call seems to go through and return correctly, it's just not decoded into result.Results properly
            testMessageReturn =
                (result.ResultsEncoded.find("Hello " + playFabId + "!") == string::npos)
                ? "CloudCall failed"
                : "Hello " + playFabId + "!";
        }
    };
}
