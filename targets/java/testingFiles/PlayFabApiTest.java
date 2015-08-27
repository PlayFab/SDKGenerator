import static org.junit.Assert.*;
import org.junit.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

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
	private static String USER_NAME = "paul";
	private static String USER_EMAIL = "paul@playfab.com";
	private static String USER_PASSWORD = "testPassword";
	private static String CHAR_NAME = "Ragnar";
	private static boolean TITLE_CAN_UPDATE_SETTINGS = true;

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
	
	@BeforeClass
    public static void oneTimeSetUp() {
        // TODO: Load the testTitleData.json file
		PlayFabSettings.TitleId = "6195";
		PlayFabSettings.DeveloperSecretKey = "TKHKZYUQF1AFKYOKPKAZJ1HRNQY61KJZC6E79ZF9YYXR9Q74CT";
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
