using PlayFab;
using System;
using System.Collections.Generic;

namespace PlayFab.UUnit
{
    /// <summary>
    /// A real system would potentially run only the client or server API, and not both.
    /// But, they still interact with eachother directly.
    /// The tests can't be independent for Client/Server, as the sequence of calls isn't really independent for real-world scenarios.
    /// The client logs in, which triggers a server, and then back and forth.
    /// For the purpose of testing, they each have pieces of information they share with one another, and that sharing makes various calls possible.
    /// </summary>
    public class PlayFabApiTest : UUnitTestCase
    {
        private const int TEST_STAT_BASE = 10;
        private const string TEST_STAT_NAME = "str";
        private const string CHAR_TEST_TYPE = "Test";

        // Functional
        private static bool TITLE_INFO_SET = false;
        private static bool TITLE_CAN_UPDATE_SETTINGS = false;

        // Fixed values provided from testInputs
        private static string USER_NAME;
        private static string USER_EMAIL;
        private static string USER_PASSWORD;
        private static string CHAR_NAME;

        // Information fetched by appropriate API calls
        private static string playFabId;
        private static string characterId;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(Dictionary<string, string> testInputs)
        {
            string eachValue;

            TITLE_INFO_SET = true;

            // Parse all the inputs
            TITLE_INFO_SET &= testInputs.TryGetValue("titleId", out eachValue);
            PlayFabSettings.TitleId = eachValue;
            TITLE_INFO_SET &= testInputs.TryGetValue("developerSecretKey", out eachValue);
            PlayFabSettings.DeveloperSecretKey = eachValue;

            TITLE_INFO_SET &= testInputs.TryGetValue("titleCanUpdateSettings", out eachValue);
            TITLE_INFO_SET &= bool.TryParse(eachValue, out TITLE_CAN_UPDATE_SETTINGS);

            TITLE_INFO_SET &= testInputs.TryGetValue("userName", out USER_NAME);
            TITLE_INFO_SET &= testInputs.TryGetValue("userEmail", out USER_EMAIL);
            TITLE_INFO_SET &= testInputs.TryGetValue("userPassword", out USER_PASSWORD);

            TITLE_INFO_SET &= testInputs.TryGetValue("characterName", out CHAR_NAME);

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !string.IsNullOrEmpty(PlayFabSettings.TitleId)
                && !string.IsNullOrEmpty(PlayFabSettings.DeveloperSecretKey)
                && !string.IsNullOrEmpty(USER_NAME)
                && !string.IsNullOrEmpty(USER_EMAIL)
                && !string.IsNullOrEmpty(USER_PASSWORD)
                && !string.IsNullOrEmpty(CHAR_NAME);
        }

        protected override void SetUp()
        {
            if (!TITLE_INFO_SET)
                UUnitAssert.Skip(); // We cannot do client tests if the titleId is not given
        }

        protected override void TearDown()
        {
            // TODO: Destroy any characters
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        [UUnitTest]
        public void InvalidLogin()
        {
            // If the setup failed to log in a user, we need to create one.
            var request = new ClientModels.LoginWithEmailAddressRequest();
            request.TitleId = PlayFabSettings.TitleId;
            request.Email = USER_EMAIL;
            request.Password = USER_PASSWORD + "INVALID";
            var task = PlayFabClientAPI.LoginWithEmailAddressAsync(request);
            task.Wait();
            UUnitAssert.NotNull(task.Result);
            UUnitAssert.Null(task.Result.Result);
            UUnitAssert.NotNull(task.Result.Error);
            UUnitAssert.True(task.Result.Error.ErrorMessage.Contains("password"));
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        [UUnitTest]
        public void LoginOrRegister()
        {
            if (!PlayFabClientAPI.IsClientLoggedIn()) // If we haven't already logged in...
            {
                var loginRequest = new ClientModels.LoginWithEmailAddressRequest();
                loginRequest.Email = USER_EMAIL;
                loginRequest.Password = USER_PASSWORD;
                loginRequest.TitleId = PlayFabSettings.TitleId;
                var loginTask = PlayFabClientAPI.LoginWithEmailAddressAsync(loginRequest);
                loginTask.Wait();

                if (loginTask.Result != null && loginTask.Result.Result != null) // If successful, track playFabId
                    playFabId = loginTask.Result.Result.PlayFabId; // Needed for subsequent tests
            }

            if (PlayFabClientAPI.IsClientLoggedIn())
                return; // Success, already logged in

            // If the setup failed to log in a user, we need to create one.
            var registerRequest = new ClientModels.RegisterPlayFabUserRequest();
            registerRequest.TitleId = PlayFabSettings.TitleId;
            registerRequest.Username = USER_NAME;
            registerRequest.Email = USER_EMAIL;
            registerRequest.Password = USER_PASSWORD;
            var registerTask = PlayFabClientAPI.RegisterPlayFabUserAsync(registerRequest);
            registerTask.Wait();
            UUnitAssert.NotNull(registerTask.Result);
            UUnitAssert.Null(registerTask.Result.Error);
            UUnitAssert.NotNull(registerTask.Result.Result);

            playFabId = registerTask.Result.Result.PlayFabId; // Needed for subsequent tests

            UUnitAssert.True(PlayFabClientAPI.IsClientLoggedIn(), "User login failed");
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary<string, string>, DateTime
        /// </summary>
        [UUnitTest]
        public void UserDataApi()
        {
            string TEST_KEY = "testCounter";

            ClientModels.UserDataRecord testCounter;
            int testCounterValueExpected, testCounterValueActual;
            DateTime timeInitial, timeUpdated;

            var getRequest = new ClientModels.GetUserDataRequest();
            var getDataTask1 = PlayFabClientAPI.GetUserDataAsync(getRequest);
            getDataTask1.Wait();
            UUnitAssert.Null(getDataTask1.Result.Error, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask1.Result.Result, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask1.Result.Result.Data, "UserData should have been retrieved from Api call");
            if (!getDataTask1.Result.Result.Data.TryGetValue(TEST_KEY, out testCounter))
            {
                testCounter = new ClientModels.UserDataRecord();
                testCounter.Value = "0";
            }
            int.TryParse(testCounter.Value, out testCounterValueExpected);
            timeInitial = testCounter.LastUpdated;
            testCounterValueExpected = (testCounterValueExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateRequest = new ClientModels.UpdateUserDataRequest();
            updateRequest.Data = new Dictionary<string, string>();
            updateRequest.Data[TEST_KEY] = testCounterValueExpected.ToString();
            var updateTask = PlayFabClientAPI.UpdateUserDataAsync(updateRequest);
            updateTask.Wait(); // The update doesn't return anything interesting except versionID.  It's better to just re-call GetUserData again below to verify the update
            UUnitAssert.Null(updateTask.Result.Error, "UpdateUserData call failed");
            UUnitAssert.NotNull(updateTask.Result.Result, "UpdateUserData call failed");

            getRequest = new ClientModels.GetUserDataRequest();
            var getDataTask2 = PlayFabClientAPI.GetUserDataAsync(getRequest);
            getDataTask2.Wait();
            UUnitAssert.Null(getDataTask2.Result.Error, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask2.Result.Result, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask2.Result.Result.Data, "UserData should have been retrieved from Api call");
            getDataTask2.Result.Result.Data.TryGetValue(TEST_KEY, out testCounter);
            UUnitAssert.NotNull(testCounter, "The updated UserData was not found in the Api results");
            int.TryParse(testCounter.Value, out testCounterValueActual);
            timeUpdated = testCounter.LastUpdated;
            UUnitAssert.Equals(testCounterValueExpected, testCounterValueActual);
            UUnitAssert.True(timeUpdated > timeInitial);
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is saved correctly, and that specific types are tested
        /// Parameter types tested: Dictionary<string, int> 
        /// </summary>
        [UUnitTest]
        public void UserStatisticsApi()
        {
            int testStatExpected, testStatActual;

            var getRequest = new ClientModels.GetUserStatisticsRequest();
            var getStatTask1 = PlayFabClientAPI.GetUserStatisticsAsync(getRequest);
            getStatTask1.Wait();
            UUnitAssert.Null(getStatTask1.Result.Error, "UserStatistics should have been retrieved from Api call");
            UUnitAssert.NotNull(getStatTask1.Result.Result, "UserStatistics should have been retrieved from Api call");
            UUnitAssert.NotNull(getStatTask1.Result.Result.UserStatistics, "UserStatistics should have been retrieved from Api call");
            if (!getStatTask1.Result.Result.UserStatistics.TryGetValue(TEST_STAT_NAME, out testStatExpected))
                testStatExpected = TEST_STAT_BASE;
            testStatExpected = ((testStatExpected + 1) % TEST_STAT_BASE) + TEST_STAT_BASE; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            var updateRequest = new ClientModels.UpdateUserStatisticsRequest();
            updateRequest.UserStatistics = new Dictionary<string, int>();
            updateRequest.UserStatistics[TEST_STAT_NAME] = testStatExpected;
            var updateTask = PlayFabClientAPI.UpdateUserStatisticsAsync(updateRequest);
            updateTask.Wait(); // The update doesn't return anything, so can't test anything other than failure

            // Test update result - no data returned, so error or no error, based on Title settings
            if (!TITLE_CAN_UPDATE_SETTINGS)
            {
                UUnitAssert.Null(updateTask.Result.Result, "UpdateStatistics should have failed");
                UUnitAssert.NotNull(updateTask.Result.Error, "UpdateStatistics should have failed");
                return; // The rest of this tests changing settings - Which we verified we cannot do
            }
            else // if (CAN_UPDATE_SETTINGS)
            {
                UUnitAssert.Null(updateTask.Result.Error, "UpdateStatistics call failed");
                UUnitAssert.NotNull(updateTask.Result.Result, "UpdateStatistics call failed");
            }

            getRequest = new ClientModels.GetUserStatisticsRequest();
            var getStatTask2 = PlayFabClientAPI.GetUserStatisticsAsync(getRequest);
            getStatTask2.Wait();
            UUnitAssert.Null(getStatTask2.Result.Error, "UserStatistics should have been retrieved from Api call");
            UUnitAssert.NotNull(getStatTask2.Result.Result, "UserStatistics should have been retrieved from Api call");
            UUnitAssert.NotNull(getStatTask2.Result.Result.UserStatistics, "UserStatistics should have been retrieved from Api call");
            getStatTask2.Result.Result.UserStatistics.TryGetValue(TEST_STAT_NAME, out testStatActual);
            UUnitAssert.Equals(testStatExpected, testStatActual);
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        [UUnitTest]
        public void UserCharacter()
        {
            var request = new ServerModels.ListUsersCharactersRequest();
            request.PlayFabId = playFabId; // Received from client upon login
            var getCharsTask = PlayFabServerAPI.GetAllUsersCharactersAsync(request);
            getCharsTask.Wait();
            UUnitAssert.Null(getCharsTask.Result.Error, "Failed to GetChars");
            UUnitAssert.NotNull(getCharsTask.Result.Result, "Failed to GetChars");
            UUnitAssert.NotNull(getCharsTask.Result.Result.Characters, "Failed to GetChars");

            ServerModels.CharacterResult targetCharacter = null;
            foreach (var eachCharacter in getCharsTask.Result.Result.Characters)
                if (eachCharacter.CharacterName == CHAR_NAME)
                    targetCharacter = eachCharacter;

            if (targetCharacter == null)
            {
                // Create the targetCharacter since it doesn't exist
                var grantRequest = new ServerModels.GrantCharacterToUserRequest();
                grantRequest.PlayFabId = playFabId;
                grantRequest.CharacterName = CHAR_NAME;
                grantRequest.CharacterType = CHAR_TEST_TYPE;
                var grantTask = PlayFabServerAPI.GrantCharacterToUserAsync(grantRequest);
                grantTask.Wait();
                UUnitAssert.Null(grantTask.Result.Error, "Grant character failed");
                UUnitAssert.NotNull(grantTask.Result.Result, "Grant character failed");
                UUnitAssert.NotNull(grantTask.Result.Result.CharacterId, "Grant character failed");

                // Attempt to get characters again
                getCharsTask = PlayFabServerAPI.GetAllUsersCharactersAsync(request);
                getCharsTask.Wait();
                UUnitAssert.Null(getCharsTask.Result.Error, "Failed to GetChars");
                UUnitAssert.NotNull(getCharsTask.Result.Result, "Failed to GetChars");
                UUnitAssert.NotNull(getCharsTask.Result.Result.Characters, "Failed to GetChars");
                foreach (var eachCharacter in getCharsTask.Result.Result.Characters)
                    if (eachCharacter.CharacterName == CHAR_NAME)
                        targetCharacter = eachCharacter;
            }

            // Save the requested character
            UUnitAssert.NotNull(targetCharacter, "The test character did not exist, and was not successfully created");
            characterId = targetCharacter.CharacterId;
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        [UUnitTest]
        public void LeaderBoard()
        {
            var clientRequest = new ClientModels.GetLeaderboardAroundCurrentUserRequest();
            clientRequest.MaxResultsCount = 3;
            clientRequest.StatisticName = TEST_STAT_NAME;
            var clientTask = PlayFabClientAPI.GetLeaderboardAroundCurrentUserAsync(clientRequest);
            UUnitAssert.Null(clientTask.Result.Error, "Failed to get client leaderboard");
            UUnitAssert.NotNull(clientTask.Result.Result, "Failed to get client leaderboard");
            UUnitAssert.NotNull(clientTask.Result.Result.Leaderboard, "Failed to get client leaderboard");
            // Testing anything more would be testing actual functionality of the Leaderboard, which is outside the scope of this test.

            var serverRequest = new ServerModels.GetLeaderboardAroundCharacterRequest();
            serverRequest.MaxResultsCount = 3;
            serverRequest.StatisticName = TEST_STAT_NAME;
            serverRequest.CharacterId = characterId;
            serverRequest.PlayFabId = playFabId;
            var serverTask = PlayFabServerAPI.GetLeaderboardAroundCharacterAsync(serverRequest);
            UUnitAssert.Null(serverTask.Result.Error, "Failed to get server leaderboard");
            UUnitAssert.NotNull(serverTask.Result.Result, "Failed to get server leaderboard");
            UUnitAssert.NotNull(serverTask.Result.Result.Leaderboard, "Failed to get server leaderboard");
        }
    }
}
