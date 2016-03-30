import static org.junit.Assert.*;
import org.junit.*;

import java.util.Arrays;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.Date;
import java.util.Calendar;
import java.util.TimeZone;
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
            String errorMessage = (result.Error == null) ? "" : "\nPlayFab Error Message: " + result.Error.errorMessage + "\n";
            assertNull(errorMessage, result.Error);
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
        request.Password = USER_PASSWORD + "invalid";

        PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithEmailAddress(request);
        VerifyResult(result, false);
        assertTrue(result.Error.errorMessage.contains("password"));
    }

    /// <summary>
    /// CLIENT API
    /// Log in or create a user, track their PlayFabId
    /// </summary>
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

    /// <summary>
    /// CLIENT API
    /// Test that the login call sequence sends the AdvertisingId when set
    /// </summary>
    @Test
    public void LoginWithAdvertisingId()
    {
        PlayFabSettings.AdvertisingIdType = PlayFabSettings.AD_TYPE_ANDROID_ID;
        PlayFabSettings.AdvertisingIdValue = "PlayFabTestId";

        PlayFabClientModels.LoginWithEmailAddressRequest request = new PlayFabClientModels.LoginWithEmailAddressRequest();
        request.TitleId = PlayFabSettings.TitleId;
        request.Email = USER_EMAIL;
        request.Password = USER_PASSWORD;
        PlayFabResult<PlayFabClientModels.LoginResult> result = PlayFabClientAPI.LoginWithEmailAddress(request);

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
        UserStatisticsApi();

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

        //if (PlayFabSettings.LogicServerURL == null || PlayFabSettings.LogicServerURL.length() == 0)
        {
            PlayFabClientModels.GetCloudScriptUrlRequest urlRequest = new PlayFabClientModels.GetCloudScriptUrlRequest();
            PlayFabResult<PlayFabClientModels.GetCloudScriptUrlResult> urlResult = PlayFabClientAPI.GetCloudScriptUrl(urlRequest);
            VerifyResult(urlResult, true);
            assertNotNull(urlResult.Result.Url);
            assertTrue(urlResult.Result.Url.length() > 0);
        }

        PlayFabClientModels.RunCloudScriptRequest hwRequest = new PlayFabClientModels.RunCloudScriptRequest();
        hwRequest.ActionId = "helloWorld";
        PlayFabResult<PlayFabClientModels.RunCloudScriptResult> hwResult = PlayFabClientAPI.RunCloudScript(hwRequest);
        VerifyResult(hwResult, true);
        assertNotNull(hwResult.Result.ResultsEncoded);
        assertTrue(hwResult.Result.ResultsEncoded.length() > 0);
        //assertTrue(hwResult.Result.ResultsEncoded, false);

        Map<String, String> arbitraryResults = (Map<String, String>)hwResult.Result.Results;
        assertEquals(arbitraryResults.get("messageValue"), "Hello " + playFabId + "!");
    }
}
