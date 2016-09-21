import static org.junit.Assert.*;
import org.junit.*;

import java.util.*;
import java.io.*;
import java.util.Properties;

import com.google.gson.*;
import com.google.gson.reflect.*;

import com.playfab.PlayFabErrors.*;
import com.playfab.PlayFabSettings;
import com.playfab.PlayFabClientModels;
import com.playfab.PlayFabServerModels;
import com.playfab.PlayFabClientAPI;
import com.playfab.PlayFabServerAPI;

public class PlayFabApiTest
{
    // Constants
    private static final String TEST_DATA_KEY = "testCounter";
    private static final String TEST_STAT_NAME = "str";
    private static final String CHAR_TEST_TYPE = "Test";

    // Fixed values provided from testInputs
    private static String USER_EMAIL;
    private static String CHAR_NAME;
    private static boolean TITLE_CAN_UPDATE_SETTINGS;

    // Cached values
    private static String playFabId = null;
    private static String characterId = null;

    // Helpers
    private <RT> void VerifyResult(PlayFabResult<RT> result, boolean expectSuccess)
    {
        assertNotNull(result);
        String errorMessage = CompileErrorsFromResult(result);
        if (expectSuccess)
        {
            assertNull(errorMessage, result.Error);
            assertNotNull(errorMessage, result.Result);
        }
        else
        {
            assertNull(errorMessage, result.Result);
            assertNotNull(errorMessage, result.Error);
        }
    }

    private <RT> String CompileErrorsFromResult(PlayFabResult<RT> result)
    {
        if (result == null || result.Error == null)
            return null;

        String errorMessage = "";
        if (result.Error.errorMessage != null)
            errorMessage += result.Error.errorMessage;
        if (result.Error.errorDetails != null)
            for (Map.Entry<String, List<String>> pair : result.Error.errorDetails.entrySet() )
                for (String msg : pair.getValue())
                    errorMessage += "\n" + pair.getKey() + ": " + msg;
        return errorMessage;
    }

    private class TitleData
    {
        public String titleId;
        public String developerSecretKey;
        public String titleCanUpdateSettings;
        public String userEmail;
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
            //USER_EMAIL = "TODO: an email associated with an existing account on your title";
            //CHAR_NAME = "TODO: a test character (make this up for yourself)";
            return;
        }
        Gson gson = new GsonBuilder().create();
        TitleData resultData = gson.fromJson(testTitleJson, new TypeToken<TitleData>(){}.getType());
        PlayFabSettings.TitleId = resultData.titleId;
        PlayFabSettings.DeveloperSecretKey = resultData.developerSecretKey;
        TITLE_CAN_UPDATE_SETTINGS = Boolean.parseBoolean(resultData.titleCanUpdateSettings);
        USER_EMAIL = resultData.userEmail;
        CHAR_NAME = resultData.characterName;
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately log in with an inappropriate password,
    ///   and verify that the error displays as expected.
    /// </summary>
    @Test
    public void InvalidLogin()
    {
        PlayFabClientModels.LoginWithEmailAddressRequest request = new PlayFabClientModels.LoginWithEmailAddressRequest();
        request.TitleId = PlayFabSettings.TitleId;
        request.Email = USER_EMAIL;
        request.Password = "INVALID";

        PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithEmailAddress(request);
        VerifyResult(result, false);
        assertTrue(result.Error.errorMessage.contains("password"));
    }

    /// <summary>
    /// CLIENT API
    /// Try to deliberately register a user with an invalid email and password
    ///   Verify that errorDetails are populated correctly.
    /// </summary>
    @Test
    public void InvalidRegistration()
    {
        PlayFabClientModels.RegisterPlayFabUserRequest request = new PlayFabClientModels.RegisterPlayFabUserRequest();
        request.TitleId = PlayFabSettings.TitleId;
        request.Username = "x"; // Provide invalid inputs for multiple parameters, which will show up in errorDetails
        request.Email = "x"; // Provide invalid inputs for multiple parameters, which will show up in errorDetails
        request.Password = "x"; // Provide invalid inputs for multiple parameters, which will show up in errorDetails

        PlayFabResult<PlayFabClientModels.RegisterPlayFabUserResult> result = PlayFabClientAPI.RegisterPlayFabUser(request);
        VerifyResult(result, false);

        String expectedEmailMsg = "email address is not valid.";
        String expectedPasswordMsg = "password must be between";
        String errorDetails = CompileErrorsFromResult(result);
        assertTrue("Expected an error about email: " + errorDetails, errorDetails.toLowerCase().contains(expectedEmailMsg));
        assertTrue("Expected an error about password: " + errorDetails, errorDetails.toLowerCase().contains(expectedPasswordMsg));
    }

    /// <summary>
    /// CLIENT API
    /// Log in or create a user, track their PlayFabId
    /// </summary>
    @Test
    public void LoginOrRegister()
    {
        PlayFabClientModels.LoginWithCustomIDRequest request = new PlayFabClientModels.LoginWithCustomIDRequest();
        request.TitleId = PlayFabSettings.TitleId;
        request.CustomId = PlayFabSettings.BuildIdentifier;
        request.CreateAccount = true;

        PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithCustomID(request);
        VerifyResult(result, true);
        assertNotNull(result.Result.PlayFabId);
        playFabId = result.Result.PlayFabId;
    }

    /// <summary>
    /// CLIENT API
    /// Test that the login call sequence sends the AdvertisingId when set
    /// </summary>
    @Test
    public void LoginWithAdvertisingId()
    {
        PlayFabSettings.AdvertisingIdType = PlayFabSettings.AD_TYPE_ANDROID_ID;
        PlayFabSettings.AdvertisingIdValue = "PlayFabTestId";

        PlayFabClientModels.LoginWithCustomIDRequest request = new PlayFabClientModels.LoginWithCustomIDRequest();
        request.TitleId = PlayFabSettings.TitleId;
        request.CustomId = PlayFabSettings.BuildIdentifier;
        request.CreateAccount = true;
        PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithCustomID(request);

        assertEquals(PlayFabSettings.AD_TYPE_ANDROID_ID + "_Successful", PlayFabSettings.AdvertisingIdType);
    }

    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is correctly modified on the next call.
    /// Parameter types tested: string, Dictionary<string, string>, DateTime
    /// </summary>
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

        // Get the UTC timestamp for when the record was updated
        Date timeUpdated = tempRecord.LastUpdated;

        // Generate utc timestamps within 5 minutes of "now"
        Date now = new Date();
        int utcOffset = Calendar.getInstance().getTimeZone().getRawOffset();
        Date utcnow = new Date(now.getTime() - utcOffset);
        Date testMin = new Date(utcnow.getTime() - (1000 * 60 * 5));
        Date testMax = new Date(utcnow.getTime() + (1000 * 60 * 5));

        // Verify that the update time is sufficiently close to now
        // TODO: This is not correct now that we're in daylight savings - FIX!!!
        // assertTrue("Update time does not match: " + timeUpdated + " != " + utcnow, testMin.before(timeUpdated) && timeUpdated.before(testMax));
    }

    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is saved correctly, and that specific types are tested
    /// Parameter types tested: Dictionary<string, int>
    /// </summary>
    @Test
    public void PlayerStatisticsApi()
    {
        LoginOrRegister();
        Gson gson = new GsonBuilder().create();

        PlayFabClientModels.GetPlayerStatisticsRequest getRequest = new PlayFabClientModels.GetPlayerStatisticsRequest();
        PlayFabResult<PlayFabClientModels.GetPlayerStatisticsResult> getStatsResult1 = PlayFabClientAPI.GetPlayerStatistics(getRequest);
        VerifyResult(getStatsResult1, true);
        int testStatExpected = 0;
        for(PlayFabClientModels.StatisticValue eachStat : getStatsResult1.Result.Statistics)
            if (eachStat.StatisticName.equals(TEST_STAT_NAME))
                testStatExpected = eachStat.Value;
        testStatExpected = (testStatExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

        PlayFabClientModels.UpdatePlayerStatisticsRequest updateRequest = new PlayFabClientModels.UpdatePlayerStatisticsRequest();
        updateRequest.Statistics = new ArrayList<PlayFabClientModels.StatisticUpdate>();
        PlayFabClientModels.StatisticUpdate statUpdate = new PlayFabClientModels.StatisticUpdate();
        statUpdate.StatisticName = TEST_STAT_NAME;
        statUpdate.Value = testStatExpected;
        updateRequest.Statistics.add(statUpdate);
        PlayFabResult<PlayFabClientModels.UpdatePlayerStatisticsResult> updateStatsResult = PlayFabClientAPI.UpdatePlayerStatistics(updateRequest);
        VerifyResult(updateStatsResult, true);

        PlayFabResult<PlayFabClientModels.GetPlayerStatisticsResult> getStatsResult2 = PlayFabClientAPI.GetPlayerStatistics(getRequest);
        VerifyResult(getStatsResult2, true);
        int testStatActual = -1000;
        for(PlayFabClientModels.StatisticValue eachStat : getStatsResult2.Result.Statistics)
            if (eachStat.StatisticName.equals(TEST_STAT_NAME))
                testStatActual = eachStat.Value;
        assertTrue(String.format("Stat not found: %d, Actual: %d", testStatExpected, testStatActual), testStatActual != -1000);
        assertEquals(String.format("Stats were not updated.  Expected: %d, Actual: %d", testStatExpected, testStatActual), testStatExpected, testStatActual);
    }

    /// <summary>
    /// SERVER API
    /// Get or create the given test character for the given user
    /// Parameter types tested: Contained-Classes, string
    /// </summary>
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

    /// <summary>
    /// CLIENT AND SERVER API
    /// Test that leaderboard results can be requested
    /// Parameter types tested: List of contained-classes
    /// </summary>
    @Test
    public void LeaderBoard()
    {
        LoginOrRegister();
        PlayerStatisticsApi();

        PlayFabClientModels.GetLeaderboardRequest clientRequest = new PlayFabClientModels.GetLeaderboardRequest();
        clientRequest.MaxResultsCount = 3;
        clientRequest.StatisticName = TEST_STAT_NAME;
        PlayFabResult<PlayFabClientModels.GetLeaderboardResult> clientResult = PlayFabClientAPI.GetLeaderboard(clientRequest);
        VerifyResult(clientResult, true);
        assertTrue(GetClLbCount(clientResult.Result.Leaderboard) > 0);

        PlayFabServerModels.GetLeaderboardRequest serverRequest = new PlayFabServerModels.GetLeaderboardRequest();
        serverRequest.MaxResultsCount = 3;
        serverRequest.StatisticName = TEST_STAT_NAME;
        PlayFabResult<PlayFabServerModels.GetLeaderboardResult> serverResult = PlayFabServerAPI.GetLeaderboard(serverRequest);
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

    /// <summary>
    /// CLIENT API
    /// Test that AccountInfo can be requested
    /// Parameter types tested: List of enum-as-strings converted to list of enums
    /// </summary>
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

    /// <summary>
    /// CLIENT API
    /// Test that CloudScript can be properly set up and invoked
    /// </summary>
    @Test
    public void CloudScript()
    {
        LoginOrRegister();

        PlayFabClientModels.ExecuteCloudScriptRequest hwRequest = new PlayFabClientModels.ExecuteCloudScriptRequest();
        hwRequest.FunctionName = "helloWorld";
        PlayFabResult<PlayFabClientModels.ExecuteCloudScriptResult> hwResult = PlayFabClientAPI.ExecuteCloudScript(hwRequest);
        VerifyResult(hwResult, true);
        assertNotNull(hwResult.Result.FunctionResult);
        Map<String, String> arbitraryResults = (Map<String, String>)hwResult.Result.FunctionResult;
        assertEquals(arbitraryResults.get("messageValue"), "Hello " + playFabId + "!");
    }

    /// <summary>
    /// CLIENT API
    /// Test that the client can publish custom PlayStream events
    /// </summary>
    @Test
    public void WriteEvent()
    {
        LoginOrRegister();

        PlayFabClientModels.WriteClientPlayerEventRequest request = new PlayFabClientModels.WriteClientPlayerEventRequest();
        request.EventName = "ForumPostEvent";
        request.Timestamp = new Date();
        request.Body = new HashMap<String,Object>();
        request.Body.put("Subject", "My First Post");
        request.Body.put("Body", "My awesome post.");
        PlayFabResult<PlayFabClientModels.WriteEventResponse> result = PlayFabClientAPI.WritePlayerEvent(request);
        VerifyResult(result, true);
    }
}

