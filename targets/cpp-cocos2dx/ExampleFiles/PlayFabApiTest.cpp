#include "PlayFabApiTest.h"
#include "cocos2d.h"

#define COCOS2D_DEBUG 1

using namespace std;
using namespace rapidjson;
using namespace PlayFab;
using namespace PlayFab::ClientModels;
using namespace PlayFab::ServerModels;

#pragma comment(lib, "wldap32.lib")
#pragma comment(lib, "ws2_32.lib")
#pragma comment(lib, "libcurl_imp.lib")
#pragma comment(lib, "libeay32.lib")
#pragma comment(lib, "ssleay32.lib")
#pragma comment(lib, "libzlib.lib")

namespace PlayFabApiTest
{
	// Fixed values provided from testInputs
	string USER_NAME;
	string USER_EMAIL;
	string USER_PASSWORD;
	string CHAR_NAME;
	bool TITLE_CAN_UPDATE_SETTINGS = false;

	const int TEST_STAT_BASE = 10;
	const string TEST_STAT_NAME = "str";
	const string CHAR_TEST_TYPE = "Test";
	const string TEST_TITLE_DATA_LOC = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json"; // TODO: Convert hard coded path to a relative path that always works (harder than it sounds when the unittests are run from multiple working directories)
	const string TEST_DATA_KEY = "testCounter";

	// Variables for all tests
	PlayFabClientAPI clientApi;
	PlayFabServerAPI serverApi;
	string playFabId;
	string characterId;
	// Variables for specific tests
	string testMessageReturn;
	Int32 testMessageInt;
	int testsRun, testsPassed, testsFailed;
	// Report Generation
	std::list<string> reportDetails;


	/// <summary>
	/// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
	/// (Also, we don't want lots of excess unused titles)
	/// </summary>
	bool SetTitleInfo(Document &testInputs)
	{
		CCLOG("%s", "SetTitleInfo");
		const Value::Member* each;

		// Parse all the inputs
		each = testInputs.FindMember("titleId");
		if (each != NULL) PlayFabSettings::titleId = each->value.GetString(); else return false;
		each = testInputs.FindMember("developerSecretKey");
		if (each != NULL) PlayFabSettings::developerSecretKey = each->value.GetString(); else return false;

		string blah;
		each = testInputs.FindMember("titleCanUpdateSettings");
		if (each != NULL) blah = each->value.GetString(); else return false;
		TITLE_CAN_UPDATE_SETTINGS = (blah.compare("true") == 0 || blah.compare("True") == 0 || blah.compare("TRUE") == 0);

		each = testInputs.FindMember("userName");
		if (each != NULL) USER_NAME = each->value.GetString(); else return false;
		each = testInputs.FindMember("userEmail");
		if (each != NULL) USER_EMAIL = each->value.GetString(); else return false;
		each = testInputs.FindMember("userPassword");
		if (each != NULL) USER_PASSWORD = each->value.GetString(); else return false;

		each = testInputs.FindMember("characterName");
		if (each != NULL) CHAR_NAME = each->value.GetString(); else return false;

		// Verify all the inputs won't cause crashes in the tests
		return !PlayFabSettings::titleId.empty()
			&& !PlayFabSettings::developerSecretKey.empty()
			&& !USER_NAME.empty()
			&& !USER_EMAIL.empty()
			&& !USER_PASSWORD.empty()
			&& !CHAR_NAME.empty();
	}

	/// <summary>
	/// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
	/// (Also, we don't want lots of excess unused titles)
	/// </summary>
	bool HackSetTitleInfo()
	{
		CCLOG("%s", "SetTitleInfo");

        return false;
		// TODO: Put the info for your title here (Fallback in case it can't read from the file)

		PlayFabSettings::titleId == "TODO: TitleID";
		PlayFabSettings::developerSecretKey == "TODO: A big long secret key that you should NEVER publish with your client";
		TITLE_CAN_UPDATE_SETTINGS = false; // TODO: Set to true if you've enabled this in your title.
		USER_NAME = "TODO: a test username (make this up for yourself)";
		USER_EMAIL = "TODO: a test email (use your own)";
		USER_PASSWORD = "TODO: a test password (this is the existing password for the user above, or the new password if the user doesn't exist yet)";
		CHAR_NAME = "TODO: a test character (make this up for yourself)";
		return true;
	}

	void ClientApiWait()
	{
		CCLOG("%s", "ClientApiWait");
		testMessageReturn = "pending";
		testMessageInt = -1;

		int count = 1, sleepCount = 0;
		while (count != 0)
		{
			count = clientApi.Update();
			sleepCount++;
			this_thread::sleep_for(chrono::milliseconds(1));
		}
		// assert(sleepCount < 20); // The API call shouldn't take too long
	}

	void ServerApiWait()
	{
		CCLOG("%s", "ServerApiWait");
		testMessageReturn = "pending";
		int count = 1, sleepCount = 0;
		while (count != 0)
		{
			count = serverApi.Update();
			sleepCount++;
			this_thread::sleep_for(chrono::milliseconds(1));
		}
		// assert(sleepCount < 20); // The API call shouldn't take too long
	}

	// A shared failure function for all calls (That don't expect failure)
	void SharedFailedCallback(PlayFabError& error, void* userData)
	{
		CCLOG("%s", "SharedFailedCallback");
		testMessageReturn = "API_Call_Failed";
	}

	void LoginCallback(LoginResult& result, void* userData)
	{
		CCLOG("%s", "LoginCallback");
		testMessageReturn = "Login_Success";
		playFabId = result.PlayFabId; // Successful login tracks playFabId
	}
	void LoginFailedCallback(PlayFabError& error, void* userData)
	{
		CCLOG("%s, %s", "LoginFailedCallback", error.ErrorMessage.c_str());
		if (error.ErrorMessage.find("password") != std::string::npos)
			testMessageReturn = "Login_Failed - Password";
		else if (!error.ErrorMessage.empty())
			testMessageReturn = "Login_Failed - " + error.ErrorMessage;
		else
			testMessageReturn = "Login_Failed - unknown error";
	}
	bool InvalidLogin()
	{
		CCLOG("%s", "InvalidLogin");
		LoginWithEmailAddressRequest request;
		request.TitleId = PlayFabSettings::titleId;
		request.Email = USER_EMAIL;
		request.Password = USER_PASSWORD + "INVALID";

		clientApi.LoginWithEmailAddress(request, &LoginCallback, &LoginFailedCallback, NULL);
		ClientApiWait();

		return testMessageReturn.compare("Login_Failed - Password") == 0; // This call is supposed to return as an error
	}

	void RegisterCallback(RegisterPlayFabUserResult& result, void* userData)
	{
		CCLOG("%s", "RegisterCallback");
		testMessageReturn = "Register_Success";
		playFabId = result.PlayFabId; // Successful login tracks playFabId
	}
	bool LoginOrRegister()
	{
		CCLOG("%s", "LoginOrRegister");
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
			return true;

		// If the setup failed to log in a user, we need to create one.
		RegisterPlayFabUserRequest registerRequest;
		registerRequest.TitleId = PlayFabSettings::titleId;
		registerRequest.Username = USER_NAME;
		registerRequest.Email = USER_EMAIL;
		registerRequest.Password = USER_PASSWORD;

		clientApi.RegisterPlayFabUser(registerRequest, &RegisterCallback, &SharedFailedCallback, NULL);
		ClientApiWait();

		return testMessageReturn.compare("Register_Success") == 0
			&& clientApi.IsClientLoggedIn();
	}

	void GetDataCallback(PlayFab::ClientModels::GetUserDataResult& result, void* userData)
	{
		CCLOG("%s", "GetDataCallback");
		testMessageReturn = "GetData_Success";
		std::map<string, PlayFab::ClientModels::UserDataRecord>::iterator it = result.Data.find(TEST_DATA_KEY);
		if (it != result.Data.end())
			testMessageInt = atoi(it->second.Value.c_str());
	}
	void UpdateDataCallback(PlayFab::ClientModels::UpdateUserDataResult& result, void* userData)
	{
		CCLOG("%s", "UpdateDataCallback");
		// The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
		testMessageReturn = "UpdateData_Success";
	}
	bool UserDataApi()
	{
		CCLOG("%s", "UserDataApi");
		LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

		PlayFab::ClientModels::GetUserDataRequest getRequest;
		clientApi.GetUserData(getRequest, &GetDataCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("GetData_Success") != 0) return false;
		int testCounterValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

		PlayFab::ClientModels::UpdateUserDataRequest updateRequest;

		// itoa is not avaialable in android
		char buffer[16];
		std::string temp;
		sprintf(buffer, "%d", testCounterValueExpected);
		temp.append(buffer);

		updateRequest.Data[TEST_DATA_KEY] = temp;
		clientApi.UpdateUserData(updateRequest, &UpdateDataCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("UpdateData_Success") != 0) return false;

		clientApi.GetUserData(getRequest, &GetDataCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("GetData_Success") != 0) return false;
		int testCounterValueActual = testMessageInt;

		return testCounterValueExpected == testCounterValueActual;
	}

	void GetStatsCallback(PlayFab::ClientModels::GetUserStatisticsResult& result, void* userData)
	{
		CCLOG("%s", "GetStatsCallback");
		testMessageReturn = "GetStats_Success";
		std::map<string, Int32>::iterator it = result.UserStatistics.find(TEST_STAT_NAME);
		if (it != result.UserStatistics.end())
			testMessageInt = it->second;
	}
	void UpdateStatsCallback(PlayFab::ClientModels::UpdateUserStatisticsResult& result, void* userData)
	{
		CCLOG("%s", "UpdateStatsCallback");
		// The update result doesn't contain anything interesting.  It's better to just re-call GetUserData again to verify the update
		testMessageReturn = "UpdateStats_Success";
	}
	bool UserStatisticsApi()
	{
		CCLOG("%s", "UserStatisticsApi");
		LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

		clientApi.GetUserStatistics(&GetStatsCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("GetStats_Success") != 0) return false;
		Int32 testStatValueExpected = (testMessageInt + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

		PlayFab::ClientModels::UpdateUserStatisticsRequest updateRequest;
		updateRequest.UserStatistics[TEST_STAT_NAME] = testStatValueExpected;
		clientApi.UpdateUserStatistics(updateRequest, &UpdateStatsCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("UpdateStats_Success") != 0) return false;

		clientApi.GetUserStatistics(&GetStatsCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		Int32 testStatValueActual = testMessageInt;

		return testMessageReturn.compare("GetStats_Success") == 0
			&& testStatValueExpected == testStatValueActual;
	}

	void GetCharsCallback(ListUsersCharactersResult& result, void* userData)
	{
		CCLOG("%s", "GetCharsCallback");
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
	void GrantCharCallback(PlayFab::ServerModels::GrantCharacterToUserResult& result, void* userData)
	{
		CCLOG("%s", "GrantCharCallback");
		testMessageReturn = "GrantChar_Success";
		characterId = result.CharacterId;
	}
	bool UserCharacter()
	{
		CCLOG("%s", "UserCharacter");
		LoginOrRegister(); // C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements

		ListUsersCharactersRequest request;
		request.PlayFabId = playFabId;
		serverApi.GetAllUsersCharacters(request, &GetCharsCallback, &SharedFailedCallback, NULL);
		ServerApiWait();
		if (testMessageReturn.compare("GetChars_Success") != 0) return false;

		if (characterId.empty())
		{
			// Character doesn't exist, try to create it
			PlayFab::ServerModels::GrantCharacterToUserRequest grantRequest;
			grantRequest.PlayFabId = playFabId;
			grantRequest.CharacterName = CHAR_NAME;
			grantRequest.CharacterType = CHAR_TEST_TYPE;
			serverApi.GrantCharacterToUser(grantRequest, &GrantCharCallback, &SharedFailedCallback, NULL);
			ServerApiWait();
			if (testMessageReturn.compare("GrantChar_Success") != 0) return false;
			if (characterId.empty()) return false;

			ListUsersCharactersRequest request;
			request.PlayFabId = playFabId;
			serverApi.GetAllUsersCharacters(request, &GetCharsCallback, &SharedFailedCallback, NULL);
			ServerApiWait();
			if (testMessageReturn.compare("GetChars_Success") != 0) return false;
		}

		return !characterId.empty();
	}

	void ClientLeaderboardCallback(GetLeaderboardAroundCurrentUserResult& result, void* userData)
	{
		CCLOG("%s", "ClientLeaderboardCallback");
		testMessageReturn = "GetClientLB_Success";
		testMessageInt = result.Leaderboard.size();
	}
	void ServerLeaderboardCallback(PlayFab::ServerModels::GetLeaderboardAroundCharacterResult& result, void* userData)
	{
		CCLOG("%s", "ServerLeaderboardCallback");
		testMessageReturn = "GetServerLB_Success";
		testMessageInt = result.Leaderboard.size();
	}
	bool LeaderBoard()
	{
		CCLOG("%s", "LeaderBoard");
		// C++ Environment is nicely secluded, but also means that we have to manually handle sequential requirements
		LoginOrRegister();
		UserCharacter();

		GetLeaderboardAroundCurrentUserRequest clientRequest;
		clientRequest.MaxResultsCount = 3;
		clientRequest.StatisticName = TEST_STAT_NAME;
		clientApi.GetLeaderboardAroundCurrentUser(clientRequest, &ClientLeaderboardCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		if (testMessageReturn.compare("GetClientLB_Success") != 0) return false;
		if (testMessageInt <= 0) return false;

		PlayFab::ServerModels::GetLeaderboardAroundCharacterRequest serverRequest;
		serverRequest.MaxResultsCount = 3;
		serverRequest.StatisticName = TEST_STAT_NAME;
		serverRequest.CharacterId = characterId;
		serverRequest.PlayFabId = playFabId;
		serverApi.GetLeaderboardAroundCharacter(serverRequest, &ServerLeaderboardCallback, &SharedFailedCallback, NULL);
		ServerApiWait();
		return testMessageReturn.compare("GetServerLB_Success") == 0
			&& testMessageInt > 0;
	}

	// The primary purpose of this test is to verify that enums work properly
	void AcctInfoCallback(GetAccountInfoResult& result, void* userData)
	{
		CCLOG("%s", "AcctInfoCallback");
		if (result.AccountInfo == NULL || result.AccountInfo->TitleInfo == NULL || result.AccountInfo->TitleInfo->Origination.isNull())
		{
			testMessageReturn = "Enums not properly tested";
		}
		else // Received data-format as expected
		{
			auto output = result.AccountInfo->TitleInfo->Origination.mValue; // TODO: Basic verification of this value (range maybe?)
			testMessageReturn = "Enums tested";
		}
	}
	bool AccountInfo()
	{
		CCLOG("%s", "AccountInfo");
		LoginOrRegister();

		GetAccountInfoRequest request;
		request.PlayFabId = playFabId;
		clientApi.GetAccountInfo(request, &AcctInfoCallback, &SharedFailedCallback, NULL);
		ClientApiWait();
		return testMessageReturn.compare("Enums tested") == 0;
	}

	void ReportTestOutput(unittest_pointer TestFunc, std::string testName)
	{
		CCLOG("%s", "ReportTestOutput");
		testsRun++;

		// Not sure where to place this output, but for now, it can be viewed in the debugger
		unsigned int start = clock();
		bool success = TestFunc();
		unsigned int end = clock();
		if (success) testsPassed++; else testsFailed++;

		string outputLine;
		outputLine.reserve(160); // Upto 2 default-console lines
		char buffer[16] = {};
		sprintf(buffer, "%d", end - start);
		outputLine.append(buffer);
		while (outputLine.length() < 8)
			outputLine.insert(outputLine.begin(), ' ');
		outputLine.append("ms - ").append(success ? "PASSED" : "FAILED").append(" - ").append(testName);
		reportDetails.push_back(outputLine);
	}
	int HackishManualTestExecutor()
	{
		CCLOG("%s", "HackishManualTestExecutor");
		// Load the testTitleData
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
		else if (!HackSetTitleInfo()) // Try to load the test data saved directly in the APK
		{
			return -1; // Can't run tests because the setup failed
		}

		testsRun = testsPassed = testsFailed = 0;

		// Not sure if it's possible to do this part more dynamically in C++
		ReportTestOutput(&InvalidLogin, "InvalidLogin");
		ReportTestOutput(&LoginOrRegister, "LoginOrRegister");
		ReportTestOutput(&UserDataApi, "UserDataApi");
		ReportTestOutput(&UserStatisticsApi, "UserStatisticsApi");
		ReportTestOutput(&UserCharacter, "UserCharacter");
		ReportTestOutput(&LeaderBoard, "LeaderBoard");
		ReportTestOutput(&AccountInfo, "AccountInfo");

		return testsFailed > 0 ? 1 : 0; // Return code for the program itself
	}
	string GetTestReport()
	{
		CCLOG("%s", "GetTestReport");
		string output;
		output.reserve(reportDetails.size() * 160);
		for (auto it = reportDetails.begin(), end = reportDetails.end(); it != end; ++it)
		{
			output.append(*it).append("\n");
		}
		char bufRun[16] = {}, bufPass[16] = {}, bufFail[16] = {};
		sprintf(bufRun, "%d", testsRun);
		sprintf(bufPass, "%d", testsPassed);
		sprintf(bufFail, "%d", testsFailed);

		output.append("Tests run: ").append(bufRun).append(", Tests Passed: ").append(bufPass).append(", Tests Failed: ").append(bufFail);
		return output;
	}
}
