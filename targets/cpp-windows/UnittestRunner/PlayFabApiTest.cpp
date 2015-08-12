#include <fstream>
#include "CppUnitTest.h"
#include "playfab/PlayFabClientDataModels.h"
#include "playfab/PlayFabServerDataModels.h"
#include "playfab/PlayFabClientAPI.h"
#include "playfab/PlayFabServerAPI.h"
#include <thread>         // std::this_thread::sleep_for
#include <chrono>         // std::chrono::seconds

using namespace Microsoft::VisualStudio::CppUnitTestFramework;
using namespace std;
using namespace rapidjson;
using namespace PlayFab;
using namespace PlayFab::ClientModels;
using namespace PlayFab::ServerModels;

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
	const string TEST_TITLE_DATA_LOC = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json";
	const string TEST_DATA_KEY = "testCounter";

	// Variables for specific tests
	string testMessageReturn;
	Int32 testMessageInt;

	TEST_CLASS(PlayFabApiTest)
	{
	public:
		/// <summary>
		/// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
		/// (Also, we don't want lots of excess unused titles)
		/// </summary>
		static void SetTitleInfo(Document &testInputs)
		{
			const Value::Member* each;

			TITLE_INFO_SET = true;

			// Parse all the inputs
			each = testInputs.FindMember("titleId");
			if (each != NULL) PlayFabSettings::titleId = each->value.GetString(); else TITLE_INFO_SET = false;
			each = testInputs.FindMember("developerSecretKey");
			if (each != NULL) PlayFabSettings::developerSecretKey = each->value.GetString(); else TITLE_INFO_SET = false;

			string blah;
			each = testInputs.FindMember("titleCanUpdateSettings");
			if (each != NULL) blah = each->value.GetString(); else TITLE_INFO_SET = false;
			TITLE_CAN_UPDATE_SETTINGS = (blah.compare("true") == 0 || blah.compare("True") == 0 || blah.compare("TRUE") == 0);

			each = testInputs.FindMember("userName");
			if (each != NULL) USER_NAME = each->value.GetString(); else TITLE_INFO_SET = false;
			each = testInputs.FindMember("userEmail");
			if (each != NULL) USER_EMAIL = each->value.GetString(); else TITLE_INFO_SET = false;
			each = testInputs.FindMember("userPassword");
			if (each != NULL) USER_PASSWORD = each->value.GetString(); else TITLE_INFO_SET = false;

			each = testInputs.FindMember("characterName");
			if (each != NULL) CHAR_NAME = each->value.GetString(); else TITLE_INFO_SET = false;

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
				count = clientApi.Update();
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
				count = serverApi.Update();
				sleepCount++;
				this_thread::sleep_for(chrono::milliseconds(1));
			}
			// Assert::IsTrue(sleepCount < 20); // The API call shouldn't take too long
		}

		// A shared failure function for all calls (That don't expect failure)
		static void FailedCallback(PlayFabError& error, void* userData)
		{
			testMessageReturn = "API_Call_Failed";
		}

		TEST_METHOD(InvalidLogin)
		{
			LoginWithEmailAddressRequest request;
			request.TitleId = PlayFabSettings::titleId;
			request.Email = USER_EMAIL;
			request.Password = USER_PASSWORD + "INVALID";

			clientApi.LoginWithEmailAddress(request, &LoginCallback, &LoginFailedCallback, NULL);
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

		TEST_METHOD(LoginOrRegister)
		{
			if (!clientApi.IsClientLoggedIn()) // If we haven't already logged in...
			{
				LoginWithEmailAddressRequest loginRequest;
				loginRequest.TitleId = PlayFabSettings::titleId;
				loginRequest.Email = USER_EMAIL;
				loginRequest.Password = USER_PASSWORD;

				clientApi.LoginWithEmailAddress(loginRequest, &LoginCallback, &LoginFailedCallback, NULL);
				ClientApiWait();
			}

			if (testMessageReturn.compare("Login_Success") == 0 && clientApi.IsClientLoggedIn())
				return;

			// If the setup failed to log in a user, we need to create one.
			RegisterPlayFabUserRequest registerRequest;
			registerRequest.TitleId = PlayFabSettings::titleId;
			registerRequest.Username = USER_NAME;
			registerRequest.Email = USER_EMAIL;
			registerRequest.Password = USER_PASSWORD;

			clientApi.RegisterPlayFabUser(registerRequest, &RegisterCallback, &FailedCallback, NULL);
			ClientApiWait();

			Assert::IsTrue(testMessageReturn.compare("Register_Success") == 0);
			Assert::IsTrue(clientApi.IsClientLoggedIn());
		}
		static void RegisterCallback(RegisterPlayFabUserResult& result, void* userData)
		{
			testMessageReturn = "Register_Success";
			playFabId = result.PlayFabId; // Successful login tracks playFabId
		}

		TEST_METHOD(UserDataApi)
		{
			LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

			PlayFab::ClientModels::GetUserDataRequest getRequest;
			clientApi.GetUserData(getRequest, &GetDataCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0);
			int testCounterValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

			PlayFab::ClientModels::UpdateUserDataRequest updateRequest;
			char buffer[12];
			updateRequest.Data[TEST_DATA_KEY] = itoa(testCounterValueExpected, buffer, 10);
			clientApi.UpdateUserData(updateRequest, &UpdateDataCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("UpdateData_Success") == 0);

			clientApi.GetUserData(getRequest, &GetDataCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetData_Success") == 0);
			int testCounterValueActual = testMessageInt;

			Assert::AreEqual(testCounterValueExpected, testCounterValueActual);
		}
		static void GetDataCallback(PlayFab::ClientModels::GetUserDataResult& result, void* userData)
		{
			testMessageReturn = "GetData_Success";
			std::map<string, PlayFab::ClientModels::UserDataRecord>::iterator it = result.Data.find(TEST_DATA_KEY);
			if (it != result.Data.end())
				testMessageInt = atoi(it->second.Value.c_str());
		}
		static void UpdateDataCallback(PlayFab::ClientModels::UpdateUserDataResult& result, void* userData)
		{
			// The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
			testMessageReturn = "UpdateData_Success";
		}

		TEST_METHOD(UserStatisticsApi)
		{
			LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

			clientApi.GetUserStatistics(&GetStatsCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0);
			Int32 testStatValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

			PlayFab::ClientModels::UpdateUserStatisticsRequest updateRequest;
			char buffer[12];
			updateRequest.UserStatistics[TEST_STAT_NAME] = testStatValueExpected;
			clientApi.UpdateUserStatistics(updateRequest, &UpdateStatsCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("UpdateStats_Success") == 0);

			clientApi.GetUserStatistics(&GetStatsCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetStats_Success") == 0);
			Int32 testStatValueActual = testMessageInt;

			Assert::AreEqual(testStatValueExpected, testStatValueActual);
		}
		static void GetStatsCallback(PlayFab::ClientModels::GetUserStatisticsResult& result, void* userData)
		{
			testMessageReturn = "GetStats_Success";
			std::map<string, Int32>::iterator it = result.UserStatistics.find(TEST_STAT_NAME);
			if (it != result.UserStatistics.end())
				testMessageInt = it->second;
		}
		static void UpdateStatsCallback(PlayFab::ClientModels::UpdateUserStatisticsResult& result, void* userData)
		{
			// The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
			testMessageReturn = "UpdateStats_Success";
		}

		TEST_METHOD(UserCharacter)
		{
			LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

			ListUsersCharactersRequest request;
			request.PlayFabId = playFabId;
			serverApi.GetAllUsersCharacters(request, &GetCharsCallback, &FailedCallback, NULL);
			ServerApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetChars_Success") == 0);

			if (characterId.empty())
			{
				// Character doesn't exist, try to create it
				PlayFab::ServerModels::GrantCharacterToUserRequest grantRequest;
				grantRequest.PlayFabId = playFabId;
				grantRequest.CharacterName = CHAR_NAME;
				grantRequest.CharacterType = CHAR_TEST_TYPE;
				serverApi.GrantCharacterToUser(grantRequest, &GrantCharCallback, &FailedCallback, NULL);
				ServerApiWait();
				Assert::IsTrue(testMessageReturn.compare("GrantChar_Success") == 0);
				Assert::IsTrue(!characterId.empty());

				ListUsersCharactersRequest request;
				request.PlayFabId = playFabId;
				serverApi.GetAllUsersCharacters(request, &GetCharsCallback, &FailedCallback, NULL);
				ServerApiWait();
				Assert::IsTrue(testMessageReturn.compare("GetChars_Success") == 0);
			}

			Assert::IsTrue(!characterId.empty());
		}
		static void GetCharsCallback(ListUsersCharactersResult& result, void* userData)
		{
			testMessageReturn = "GetChars_Success";
			characterId = ""; // Reset the characterId

			list<CharacterResult>::const_iterator it;
			for (it = result.Characters.begin(); it != result.Characters.end(); ++it)
			{
				if (it->CharacterName.compare(CHAR_NAME) == 0)
				{
					testMessageInt = 1;
					characterId = it->CharacterId; // Correct character found, set the info
				}
			}
		}
		static void GrantCharCallback(PlayFab::ServerModels::GrantCharacterToUserResult& result, void* userData)
		{
			testMessageReturn = "GrantChar_Success";
			characterId = result.CharacterId;
		}

		TEST_METHOD(LeaderBoard)
		{
			// C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements
			LoginOrRegister();
			UserCharacter();

			GetLeaderboardAroundCurrentUserRequest clientRequest;
			clientRequest.MaxResultsCount = 3;
			clientRequest.StatisticName = TEST_STAT_NAME;
			clientApi.GetLeaderboardAroundCurrentUser(clientRequest, &ClientLeaderboardCallback, &FailedCallback, NULL);
			ClientApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetClientLB_Success") == 0);
			Assert::IsTrue(testMessageInt != 0);

			PlayFab::ServerModels::GetLeaderboardAroundCharacterRequest serverRequest;
			serverRequest.MaxResultsCount = 3;
			serverRequest.StatisticName = TEST_STAT_NAME;
			serverRequest.CharacterId = characterId;
			serverRequest.PlayFabId = playFabId;
			serverApi.GetLeaderboardAroundCharacter(serverRequest, &ServerLeaderboardCallback, &FailedCallback, NULL);
			ServerApiWait();
			Assert::IsTrue(testMessageReturn.compare("GetServerLB_Success") == 0);
			Assert::IsTrue(testMessageInt != 0);
		}
		static void ClientLeaderboardCallback(GetLeaderboardAroundCurrentUserResult& result, void* userData)
		{
			testMessageReturn = "GetClientLB_Success";
			testMessageInt = result.Leaderboard.size();
		}
		static void ServerLeaderboardCallback(PlayFab::ServerModels::GetLeaderboardAroundCharacterResult& result, void* userData)
		{
			testMessageReturn = "GetServerLB_Success";
			testMessageInt = result.Leaderboard.size();
		}

	private:
		PlayFabClientAPI clientApi;
		PlayFabServerAPI serverApi;
	};
}
