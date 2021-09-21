using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using PlayFab.ClientModels;
using PlayFab.Internal;
using UnittestRunner;

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
        private const string TEST_STAT_NAME = "str";
        private const string CHAR_TEST_TYPE = "Test";

        private static PlayFabClientAPI Client = null;
        private static PlayFabServerAPI Server = null;

        // Functional
        private static bool TITLE_INFO_SET = false;

        // Fixed values provided from testInputs
        private static string USER_EMAIL;
        private static string CHAR_NAME;

        // Information fetched by appropriate API calls
        private static string _playFabId;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            TITLE_INFO_SET = true;

            // Parse all the inputs
            PlayFabDefaultSettings.TitleId = testInputs.titleId;
            PlayFabDefaultSettings.DeveloperSecretKey = testInputs.developerSecretKey;
            USER_EMAIL = testInputs.userEmail;
            CHAR_NAME = testInputs.characterName;

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !string.IsNullOrEmpty(PlayFabDefaultSettings.TitleId)
                && !string.IsNullOrEmpty(PlayFabDefaultSettings.DeveloperSecretKey)
                && !string.IsNullOrEmpty(USER_EMAIL)
                && !string.IsNullOrEmpty(CHAR_NAME);

            Client = new PlayFabClientAPI();
            Server = new PlayFabServerAPI();
        }

        protected override void SetUp()
        {
            if (!TITLE_INFO_SET)
                UUnitAssert.Skip(); // We cannot do client tests if the titleId is not given
        }

        protected override void TearDown()
        {
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
            var task = Client.LoginWithEmailAddressAsync(Client.Settings.TitleId, USER_EMAIL, "INVALID");
            try
            {
                task.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(ex.InnerException.Message.Contains("password"));
                return;
            }
            UUnitAssert.False(true, "This should be unreachable");
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a user with an invalid email and password
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        [UUnitTest]
        public void InvalidRegistration()
        {
            var expectedEmailMsg = "email address is not valid.";
            var expectedPasswordMsg = "password must be between";

            var registerTask = Client.RegisterPlayFabUserAsync(Client.Settings.TitleId, "x", "x", "x");
            try
            {
                registerTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(ex.InnerException.Message.ToLowerInvariant().Contains(expectedEmailMsg), "Expected an error about bad email address: " + ex.InnerException.Message);
                UUnitAssert.True(ex.InnerException.Message.ToLowerInvariant().Contains(expectedPasswordMsg), "Expected an error about bad password: " + ex.InnerException.Message);
                return;
            }
            UUnitAssert.False(true, "This should be unreachable");
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        [UUnitTest]
        public void LoginOrRegister()
        {
            var loginTask = Client.LoginWithCustomIDAsync(Client.Settings.TitleId, PlayFabVersion.BuildIdentifier, true);
            try
            {
                loginTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            _playFabId = loginTask.Result.PlayFabId; // Needed for subsequent tests
            UUnitAssert.True(Client.IsClientLoggedIn(), "User login failed");
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary&gt;string, string>, DateTime
        /// </summary>
        [UUnitTest]
        public void UserDataApi()
        {
            var TEST_KEY = "testCounter";

            UserDataRecord testCounter;
            int testCounterValueExpected, testCounterValueActual;

            var getDataTask1 = Client.GetUserDataAsync();
            try
            {
                getDataTask1.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(getDataTask1.Result, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask1.Result.Data, "UserData should have been retrieved from Api call");

            if (!getDataTask1.Result.Data.TryGetValue(TEST_KEY, out testCounter))
                testCounter = new UserDataRecord { Value = "0" };
            int.TryParse(testCounter.Value, out testCounterValueExpected);
            testCounterValueExpected = (testCounterValueExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateTask = Client.UpdateUserDataAsync(new Dictionary<string, string> { { TEST_KEY, testCounterValueExpected.ToString() } });

            try
            {
                updateTask.Wait(); // The update doesn't return anything interesting except versionID.  It's better to just re-call GetUserData again below to verify the update
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(updateTask.Result, "UpdateUserData call failed");

            var getDataTask2 = Client.GetUserDataAsync();
            try
            {
                getDataTask2.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(getDataTask2.Result, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getDataTask2.Result.Data, "UserData should have been retrieved from Api call");

            getDataTask2.Result.Data.TryGetValue(TEST_KEY, out testCounter);
            UUnitAssert.NotNull(testCounter, "The updated UserData was not found in the Api results");
            int.TryParse(testCounter.Value, out testCounterValueActual);
            UUnitAssert.IntEquals(testCounterValueExpected, testCounterValueActual);

            var timeUpdated = testCounter.LastUpdated;
            var testMin = DateTime.UtcNow - TimeSpan.FromMinutes(5);
            var testMax = testMin + TimeSpan.FromMinutes(10);
            UUnitAssert.True(testMin <= timeUpdated && timeUpdated <= testMax);
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is saved correctly, and that specific types are tested
        /// Parameter types tested: Dictionary&gt;string, int> 
        /// </summary>
        [UUnitTest]
        public void PlayerStatisticsApi()
        {
            int testStatExpected = 0, testStatActual = int.MinValue;

            var getStatTask1 = Client.GetPlayerStatisticsAsync();
            try
            {
                getStatTask1.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }

            UUnitAssert.NotNull(getStatTask1.Result, "PlayerStatistics should have been retrieved from Api call");

            foreach (var eachStat in getStatTask1.Result)
                if (eachStat.StatisticName == TEST_STAT_NAME)
                    testStatExpected = eachStat.Value;
            testStatExpected = (testStatExpected + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            var updateTask = Client.UpdatePlayerStatisticsAsync(new List<StatisticUpdate> { new StatisticUpdate { StatisticName = TEST_STAT_NAME, Value = testStatExpected } });
            try
            {
                updateTask.Wait(); // The update doesn't return anything, so can't test anything other than failure
            }
            catch (Exception ex)
            {
                UUnitAssert.Fail(ex.Message);
            }

            var getStatTask2 = Client.GetPlayerStatisticsAsync();
            try
            {
                getStatTask2.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.Fail(ex.Message);
            }
            UUnitAssert.NotNull(getStatTask2.Result, "PlayerStatistics should have been retrieved from Api call");

            foreach (var eachStat in getStatTask2.Result)
                if (eachStat.StatisticName == TEST_STAT_NAME)
                    testStatActual = eachStat.Value;

            UUnitAssert.IntEquals(testStatExpected, testStatActual);
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        [UUnitTest]
        public void UserCharacter()
        {
            var getCharsTask = Server.GetAllUsersCharactersAsync(_playFabId);
            try
            {
                getCharsTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(getCharsTask.Result, "Failed to GetChars");

            ServerModels.CharacterResult targetCharacter = null;
            foreach (var eachCharacter in getCharsTask.Result)
                if (eachCharacter.CharacterName == CHAR_NAME)
                    targetCharacter = eachCharacter;

            if (targetCharacter == null)
            {
                // Create the targetCharacter since it doesn't exist
                var grantTask = Server.GrantCharacterToUserAsync(_playFabId, CHAR_NAME, CHAR_TEST_TYPE);
                try
                {
                    grantTask.Wait();
                }
                catch (Exception ex)
                {
                    UUnitAssert.True(false, ex.Message);
                }
                UUnitAssert.NotNull(grantTask.Result, "Grant character failed");

                // Attempt to get characters again
                getCharsTask = Server.GetAllUsersCharactersAsync(_playFabId);
                try
                {
                    getCharsTask.Wait();
                }
                catch (Exception ex)
                {
                    UUnitAssert.True(false, ex.Message);
                }
                UUnitAssert.NotNull(getCharsTask.Result, "Failed to GetChars");
                foreach (var eachCharacter in getCharsTask.Result)
                    if (eachCharacter.CharacterName == CHAR_NAME)
                        targetCharacter = eachCharacter;
            }

            // Save the requested character
            UUnitAssert.NotNull(targetCharacter, "The test character did not exist, and was not successfully created");
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        [UUnitTest]
        public void LeaderBoard()
        {
            var clientTask = Client.GetLeaderboardAsync(TEST_STAT_NAME, 0, 3);
            try
            {
                clientTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(clientTask.Result, "Failed to get client leaderboard");
            UUnitAssert.True(clientTask.Result.Leaderboard.Count > 0, "Leaderboard does not contain enough entries.");

            var serverTask = Server.GetLeaderboardAsync(TEST_STAT_NAME, 0, 3);
            try
            {
                clientTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(serverTask.Result, "Failed to get server leaderboard");
            UUnitAssert.True(serverTask.Result.Leaderboard.Count > 0, "Leaderboard does not contain enough entries.");
        }

        /// <summary>
        /// CLIENT API
        /// Test that AccountInfo can be requested
        /// Parameter types tested: List of enum-as-strings converted to list of enums
        /// </summary>
        [UUnitTest]
        public void AccountInfo()
        {
            var task = Client.GetAccountInfoAsync(_playFabId);
            try
            {
                task.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(task.Result, "Failed to get accountInfo");
            UUnitAssert.NotNull(task.Result.TitleInfo, "Failed to get accountInfo");
            UUnitAssert.NotNull(task.Result.TitleInfo.Origination, "Failed to get Origination Enum");
            UUnitAssert.True(Enum.IsDefined(typeof(UserOrigination), task.Result.TitleInfo.Origination.Value), "Origination Enum not valid");
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        [UUnitTest]
        public void CloudScript()
        {
            var cloudTask = Client.ExecuteCloudScriptAsync("helloWorld");
            try
            {
                cloudTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            UUnitAssert.NotNull(cloudTask.Result, "Failed to Execute CloudScript");
            UUnitAssert.NotNull(cloudTask.Result.FunctionResult, "Failed to Execute CloudScript");

            // Get the helloWorld return message
            var jobj = (JObject)cloudTask.Result.FunctionResult;
            UUnitAssert.NotNull(jobj);
            JToken jtok;
            jobj.TryGetValue("messageValue", out jtok);
            UUnitAssert.NotNull(jtok);
            var jval = jtok as JValue;
            UUnitAssert.NotNull(jval);
            var actualMessage = jval.Value as string;
            UUnitAssert.StringEquals("Hello " + _playFabId + "!", actualMessage);
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript errors can be deciphered
        /// </summary>
        [UUnitTest]
        public void CloudScriptError()
        {
            var cloudTask = Client.ExecuteCloudScriptAsync("throwError");
            try
            {
                cloudTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            // Get the JavascriptException result
            UUnitAssert.IsNull(cloudTask.Result.FunctionResult);
            UUnitAssert.NotNull(cloudTask.Result.Error);
            UUnitAssert.StringEquals(cloudTask.Result.Error.Error, "JavascriptException");
        }

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        [UUnitTest]
        public void WriteEvent()
        {
            var writeTask = Client.WritePlayerEventAsync("ForumPostEvent", DateTime.UtcNow, new Dictionary<string, object> {
                    { "Subject", "My First Post" },
                    { "Body", "My awesome Post." },
                });
            try
            {
                writeTask.Wait();
            }
            catch (Exception ex)
            {
                UUnitAssert.True(false, ex.Message);
            }
            // ATM there's nothing we can check after this thing executes.
        }
    }
}
