package com.playfab.test;

import static org.junit.Assert.*;
import org.junit.*;

import java.util.*;
import java.io.*;

import com.google.gson.*;
import com.google.gson.reflect.*;

import com.playfab.PlayFabErrors.*;
import com.playfab.PlayFabSettings;
import com.playfab.PlayFabClientModels;
import com.playfab.PlayFabClientAPI;

public class PlayFabApiTest
{
    // Constants
    private static final String TEST_DATA_KEY = "testCounter";
    private static final String TEST_STAT_NAME = "str";
    private static final String CHAR_TEST_TYPE = "Test";

    // Fixed values provided from testInputs
    private static String USER_EMAIL;
    private static String CHAR_NAME;

    // Cached values
    private static String playFabId = null;

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
        public String userEmail;
    }

    @BeforeClass
    public static void oneTimeSetUp() {
        Map<String, String> env = System.getenv();
        String testTitleDataFile = env.get("PF_TEST_TITLE_DATA_JSON"); // Set the PF_TEST_TITLE_DATA_JSON env-var to the path of a testTitleData.json file (described here: https://github.com/PlayFab/SDKGenerator/blob/master/JenkinsConsoleUtility/testTitleData.md)
        String testTitleJson;
        try {
            File file = new File(testTitleDataFile);
            FileInputStream fis = new FileInputStream(file);
            byte[] data = new byte[(int) file.length()];
            fis.read(data);
            fis.close();
            testTitleJson = new String(data);
        } catch (IOException e) {
            // NOTE: Un-Comment and put your title-specific information here to test your title, or use PF_TEST_TITLE_DATA_JSON above
            //PlayFabSettings.TitleId = "TODO: TitleID";
            //USER_EMAIL = "TODO: an email associated with an existing account on your title";
            return;
        }
        Gson gson = new GsonBuilder().create();
        TitleData resultData = gson.fromJson(testTitleJson, new TypeToken<TitleData>(){}.getType());
        PlayFabSettings.TitleId = resultData.titleId;
        USER_EMAIL = resultData.userEmail;
    }

    /**
     *  CLIENT API
     *  Try to deliberately log in with an inappropriate password,
     *    and verify that the error displays as expected.
     */
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

    /**
     *  CLIENT API
     *  Try to deliberately register a user with an invalid email and password
     *    Verify that errorDetails are populated correctly.
     */
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

    /**
     *  CLIENT API
     *  Log in or create a user, track their PlayFabId
     */
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

    /**
     *  CLIENT API
     *  Test that the login call sequence sends the AdvertisingId when set
     */
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

    /**
     *  CLIENT API
     *  Test a sequence of calls that modifies saved data,
     *    and verifies that the next sequential API call contains updated data.
     *  Verify that the data is correctly modified on the next call.
     *  Parameter types tested: string, Dictionary<string, string>, DateTime
     */
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

    /**
     *  CLIENT API
     *  Test a sequence of calls that modifies saved data,
     *    and verifies that the next sequential API call contains updated data.
     *  Verify that the data is saved correctly, and that specific types are tested
     *  Parameter types tested: Dictionary<string, int>
     */
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

    /**
     *  CLIENT API
     *  Get or create the given test character for the given user
     *  Parameter types tested: Contained-Classes, string
     */
    @Test
    public void UserCharacter()
    {
        LoginOrRegister();

        PlayFabClientModels.ListUsersCharactersRequest getRequest = new PlayFabClientModels.ListUsersCharactersRequest();
        getRequest.PlayFabId = playFabId;
        PlayFabResult<PlayFabClientModels.ListUsersCharactersResult> getCharsResult = PlayFabClientAPI.GetAllUsersCharacters(getRequest);
        VerifyResult(getCharsResult, true);
    }

    /**
     *  CLIENT API
     *  Test that leaderboard results can be requested
     *  Parameter types tested: List of contained-classes
     */
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
    }
    private int GetClLbCount(List<PlayFabClientModels.PlayerLeaderboardEntry> lb)
    {
        int count = 0;
        if (lb != null)
            count = lb.size();
        return count;
    }

    /**
     *  CLIENT API
     *  Test that AccountInfo can be requested
     *  Parameter types tested: List of enum-as-strings converted to list of enums
     */
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

    /**
     *  CLIENT API
     *  Test that CloudScript can be properly set up and invoked
     */
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

    /**
     *  CLIENT API
     *  Test that CloudScript errors can be deciphered
     */
    @Test
    public void CloudScriptError()
    {
        LoginOrRegister();

        PlayFabClientModels.ExecuteCloudScriptRequest errRequest = new PlayFabClientModels.ExecuteCloudScriptRequest();
        errRequest.FunctionName = "throwError";
        PlayFabResult<PlayFabClientModels.ExecuteCloudScriptResult> errResult = PlayFabClientAPI.ExecuteCloudScript(errRequest);
        VerifyResult(errResult, true);
        assertTrue(errResult.Result.FunctionResult == null);
        assertNotNull(errResult.Result.Error);
        assertEquals(errResult.Result.Error.Error, "JavascriptException");
    }

    /**
     *  CLIENT API
     *  Test that the client can publish custom PlayStream events
     */
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

