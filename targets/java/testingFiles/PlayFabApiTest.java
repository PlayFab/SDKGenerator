import static org.junit.Assert.*;
import org.junit.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.io.*;
import java.util.Properties;

import com.google.gson.*;
import com.google.gson.reflect.*;

import playfab.PlayFabErrors.*;
import playfab.PlayFabSettings;
import playfab.PlayFabClientModels;
import playfab.PlayFabServerModels;
import playfab.PlayFabClientAPI;
import playfab.PlayFabServerAPI;

public class PlayFabApiTest
{
	// Constants
	private static final String TEST_DATA_KEY = "testCounter";
	private static final String TEST_STAT_NAME = "str";
	private static final String CHAR_TEST_TYPE = "Test";

	// Fixed values provided from testInputs
	private static String USER_NAME;
	private static String USER_EMAIL;
	private static String USER_PASSWORD;
	private static String CHAR_NAME;
	private static boolean TITLE_CAN_UPDATE_SETTINGS;

	// Cached values
	private static String playFabId = null;
	private static String characterId = null;

	// Helpers
	private <RT> void VerifyResult(PlayFabResult<RT> result, boolean expectSuccess)
	{
		assertNotNull(result);
		if (expectSuccess)
		{
			assertNull(result.Error);
			assertNotNull(result.Result);
		}
		else
		{
			assertNull(result.Result);
			assertNotNull(result.Error);
		}
	}
	
	private class TitleData
	{
		public String titleId;
		public String developerSecretKey;
		public String titleCanUpdateSettings;
		public String userName;
		public String userEmail;
		public String userPassword;
		public String characterName;
	}
	
	@BeforeClass
    public static void oneTimeSetUp() {
		String testTitleDataFile = System.getProperty("testTitleData");
		String testTitleJson;
		try{
			File file = new File(testTitleDataFile);
			FileInputStream fis = new FileInputStream(file);
			byte[] data = new byte[(int) file.length()];
			fis.read(data);
			fis.close();
			testTitleJson = new String(data);
		} catch (IOException e) {
			// NOTE: Un-Comment and put your title-specific information here to test your title, or provide the following command line parameter when running the tests
			//   -testTitleData=YOUR_FILE_LOCATION\testTitleData.json
			//PlayFabSettings.TitleId = "TODO: TitleID";
			//PlayFabSettings.DeveloperSecretKey = "TODO: A big long secret key that you should NEVER publish with your client";
			//TITLE_CAN_UPDATE_SETTINGS = false; // TODO: Set to true if you've enabled this in your title.
			//USER_NAME = "TODO: a test username (make this up for yourself)";
			//USER_EMAIL = "TODO: a test email (use your own)";
			//USER_PASSWORD = "TODO: a test password (this is the existing password for the user above, or the new password if the user doesn't exist yet)";
			//CHAR_NAME = "TODO: a test character (make this up for yourself)";
			return;
		}
		Gson gson = new GsonBuilder().create();
		TitleData resultData = gson.fromJson(testTitleJson, new TypeToken<TitleData>(){}.getType()); 
		PlayFabSettings.TitleId = resultData.titleId;
		PlayFabSettings.DeveloperSecretKey = resultData.developerSecretKey;
		TITLE_CAN_UPDATE_SETTINGS = Boolean.parseBoolean(resultData.titleCanUpdateSettings); 
		USER_NAME = resultData.userName;
		USER_EMAIL = resultData.userEmail;
		USER_PASSWORD = resultData.userPassword;
		CHAR_NAME = resultData.characterName;
    }

	// Tests
	@Test
	public void InvalidLogin()
	{
		PlayFabClientModels.LoginWithEmailAddressRequest request = new PlayFabClientModels.LoginWithEmailAddressRequest();

		request.TitleId = PlayFabSettings.TitleId;
		request.Email = USER_EMAIL;
		request.Password = USER_PASSWORD + "invalid";

		PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithEmailAddress(request);
		VerifyResult(result, false);
		assertTrue(result.Error.ErrorMessage.contains("password"));
	}
	
	@Test
	public void LoginOrRegister()
	{
		PlayFabClientModels.LoginWithEmailAddressRequest request = new PlayFabClientModels.LoginWithEmailAddressRequest();

		request.TitleId = PlayFabSettings.TitleId;
		request.Email = USER_EMAIL;
		request.Password = USER_PASSWORD;

		PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithEmailAddress(request);
		VerifyResult(result, true);
		assertNotNull(result.Result.PlayFabId);
		playFabId = result.Result.PlayFabId;

		// TODO: Register if the login failed
	}
	
	@Test
	public void UserDataApi()
	{
		LoginOrRegister();
		
		PlayFabClientModels.GetUserDataRequest getRequest = new PlayFabClientModels.GetUserDataRequest();
		PlayFabResult<PlayFabClientModels.GetUserDataResult> getDataResult = PlayFabClientAPI.GetUserData(getRequest);
		VerifyResult(getDataResult, true);
		PlayFabClientModels.UserDataRecord tempRecord = getDataResult.Result.Data == null ? null : getDataResult.Result.Data.get(TEST_DATA_KEY);
		int testCounterValueExpected = tempRecord == null ? 0 : Integer.parseInt(tempRecord.Value);
		testCounterValueExpected = (testCounterValueExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

		PlayFabClientModels.UpdateUserDataRequest updateRequest = new PlayFabClientModels.UpdateUserDataRequest();
		updateRequest.Data = new HashMap<String,String>();
		updateRequest.Data.put(TEST_DATA_KEY, Integer.toString(testCounterValueExpected));
		PlayFabResult<PlayFabClientModels.UpdateUserDataResult> updateDataResult = PlayFabClientAPI.UpdateUserData(updateRequest);
		VerifyResult(updateDataResult, true);

		getDataResult = PlayFabClientAPI.GetUserData(getRequest);
		VerifyResult(getDataResult, true);
		tempRecord = getDataResult.Result.Data.get(TEST_DATA_KEY);
		int testCounterValueActual = tempRecord == null ? 0 : Integer.parseInt(tempRecord.Value);

		assertEquals(testCounterValueExpected, testCounterValueActual);
	}
	
	@Test
	public void UserStatisticsApi()
	{
		LoginOrRegister();
		
		PlayFabClientModels.GetUserStatisticsRequest getRequest = new PlayFabClientModels.GetUserStatisticsRequest();
		PlayFabResult<PlayFabClientModels.GetUserStatisticsResult> getStatsResult = PlayFabClientAPI.GetUserStatistics(getRequest);
		VerifyResult(getStatsResult, true);
		int testStatExpected = getStatsResult.Result.UserStatistics == null ? 0 : getStatsResult.Result.UserStatistics.get(TEST_STAT_NAME);
		testStatExpected = (testStatExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds
		
		PlayFabClientModels.UpdateUserStatisticsRequest updateRequest = new PlayFabClientModels.UpdateUserStatisticsRequest();
		updateRequest.UserStatistics = new HashMap<String,Integer>();
		updateRequest.UserStatistics.put(TEST_STAT_NAME, testStatExpected);
		PlayFabResult<PlayFabClientModels.UpdateUserStatisticsResult> updateStatsResult = PlayFabClientAPI.UpdateUserStatistics(updateRequest);
		VerifyResult(updateStatsResult, true);
		
		getStatsResult = PlayFabClientAPI.GetUserStatistics(getRequest);
		VerifyResult(getStatsResult, true);
		int testStatActual = getStatsResult.Result.UserStatistics == null ? 0 : getStatsResult.Result.UserStatistics.get(TEST_STAT_NAME);

		assertEquals(testStatExpected, testStatActual);
	}
	
	@Test
	public void UserCharacter()
	{
		LoginOrRegister();
		
		PlayFabServerModels.ListUsersCharactersRequest getRequest = new PlayFabServerModels.ListUsersCharactersRequest();
		getRequest.PlayFabId = playFabId;
		PlayFabResult<PlayFabServerModels.ListUsersCharactersResult> getCharsResult = PlayFabServerAPI.GetAllUsersCharacters(getRequest);
		VerifyResult(getCharsResult, true);
		SaveCharacterId(getCharsResult.Result.Characters);
		
		if (getCharsResult.Result.Characters == null || getCharsResult.Result.Characters.size() == 0)
		{
			PlayFabServerModels.GrantCharacterToUserRequest grantRequest = new PlayFabServerModels.GrantCharacterToUserRequest();
			grantRequest.PlayFabId = playFabId;
			grantRequest.CharacterName = CHAR_NAME;
			grantRequest.CharacterType = CHAR_TEST_TYPE;
			PlayFabResult<PlayFabServerModels.GrantCharacterToUserResult> grantResult = PlayFabServerAPI.GrantCharacterToUser(grantRequest);
			VerifyResult(getCharsResult, true);

			getRequest = new PlayFabServerModels.ListUsersCharactersRequest();
			getRequest.PlayFabId = playFabId;
			getCharsResult = PlayFabServerAPI.GetAllUsersCharacters(getRequest);
			VerifyResult(getCharsResult, true);
			SaveCharacterId(getCharsResult.Result.Characters);
		}
		
		assertTrue(characterId != null && characterId.length() > 0);
	}
	private void SaveCharacterId(List<PlayFabServerModels.CharacterResult> characters)
	{
		for (int i = 0; i < characters.size(); i++)
		{
			PlayFabServerModels.CharacterResult eachChar = characters.get(i);
			if (eachChar.CharacterName.equals(CHAR_NAME))
				characterId = eachChar.CharacterId; 
		}
	}
	
	@Test
	public void LeaderBoard()
	{
		LoginOrRegister();
		UserStatisticsApi();
		
		PlayFabClientModels.GetLeaderboardAroundCurrentUserRequest clientRequest = new PlayFabClientModels.GetLeaderboardAroundCurrentUserRequest();
		clientRequest.MaxResultsCount = 3;
		clientRequest.StatisticName = TEST_STAT_NAME;
		PlayFabResult<PlayFabClientModels.GetLeaderboardAroundCurrentUserResult> clientResult = PlayFabClientAPI.GetLeaderboardAroundCurrentUser(clientRequest);
		VerifyResult(clientResult, true);
		assertTrue(GetClLbCount(clientResult.Result.Leaderboard) > 0);
		
		PlayFabServerModels.GetLeaderboardAroundUserRequest serverRequest = new PlayFabServerModels.GetLeaderboardAroundUserRequest();
		serverRequest.MaxResultsCount = 3;
		serverRequest.StatisticName = TEST_STAT_NAME;
		serverRequest.PlayFabId = playFabId;
		PlayFabResult<PlayFabServerModels.GetLeaderboardAroundUserResult> serverResult = PlayFabServerAPI.GetLeaderboardAroundUser(serverRequest);
		VerifyResult(serverResult, true);
		assertTrue(GetSvLbCount(serverResult.Result.Leaderboard) > 0);
	}
	private int GetClLbCount(List<PlayFabClientModels.PlayerLeaderboardEntry> lb)
	{
		int count = 0;
		if (lb != null)
			count = lb.size();
		return count;
	}
	private int GetSvLbCount(List<PlayFabServerModels.PlayerLeaderboardEntry> lb)
	{
		int count = 0;
		if (lb != null)
			count = lb.size();
		return count;
	}

	@Test
	public void AccountInfo()
	{
		LoginOrRegister();
		
		PlayFabClientModels.GetAccountInfoRequest request = new PlayFabClientModels.GetAccountInfoRequest();
		request.PlayFabId = playFabId;
		PlayFabResult<PlayFabClientModels.GetAccountInfoResult> result = PlayFabClientAPI.GetAccountInfo(request);
		VerifyResult(result, true);
		assertNotNull(result.Result.AccountInfo);
		assertNotNull(result.Result.AccountInfo.TitleInfo);
		PlayFabClientModels.UserOrigination origin = result.Result.AccountInfo.TitleInfo.Origination;
		Boolean validOption = Arrays.asList(PlayFabClientModels.UserOrigination.values()).contains(origin);
		assertTrue(validOption);
	}
}
