using Newtonsoft.Json.Linq;
using PlayFab.ClientModels;
using PlayFab.Internal;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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

        private static PlayFabClientAPI Client = null;
        private static PlayFabServerAPI Server = null;

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
            PlayFabDefaultSettings.TitleId = eachValue;
            TITLE_INFO_SET &= testInputs.TryGetValue("developerSecretKey", out eachValue);
            PlayFabDefaultSettings.DeveloperSecretKey = eachValue;

            TITLE_INFO_SET &= testInputs.TryGetValue("titleCanUpdateSettings", out eachValue);
            TITLE_INFO_SET &= bool.TryParse(eachValue, out TITLE_CAN_UPDATE_SETTINGS);

            TITLE_INFO_SET &= testInputs.TryGetValue("userName", out USER_NAME);
            TITLE_INFO_SET &= testInputs.TryGetValue("userEmail", out USER_EMAIL);
            TITLE_INFO_SET &= testInputs.TryGetValue("userPassword", out USER_PASSWORD);

            TITLE_INFO_SET &= testInputs.TryGetValue("characterName", out CHAR_NAME);

            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !string.IsNullOrEmpty(PlayFabDefaultSettings.TitleId)
                && !string.IsNullOrEmpty(PlayFabDefaultSettings.DeveloperSecretKey)
                && !string.IsNullOrEmpty(USER_NAME)
                && !string.IsNullOrEmpty(USER_EMAIL)
                && !string.IsNullOrEmpty(USER_PASSWORD)
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
            // TODO: Destroy any characters
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        [UUnitTest]
        public async Task InvalidLogin()
        {
            try
            {
                var result = await Client.LoginWithEmailAddressAsync(Client.Settings.TitleId, USER_EMAIL, USER_PASSWORD + "INVALID");
            }
            catch (PlayFabException myEx)
            {
                UUnitAssert.True(myEx.Error == PlayFabErrorCode.AccountNotFound
                    || myEx.Error == PlayFabErrorCode.InvalidUsernameOrPassword
                    || myEx.Error == PlayFabErrorCode.InvalidPassword
                    || myEx.Error == PlayFabErrorCode.InvalidEmailOrPassword);
                return;
            }
            UUnitAssert.False(true, "This should be unreachable");
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a character with an invalid email and password.
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        [UUnitTest]
        public async Task InvalidRegistration()
        {
            try
            {
                var result = await Client.RegisterPlayFabUserAsync(Client.Settings.TitleId, "x", "x", "x");
            }
            catch (PlayFabException myEx)
            {
                UUnitAssert.True(myEx.Error == PlayFabErrorCode.InvalidParams);
                return;
            }
            UUnitAssert.False(true, "This should be unreachable");
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        [UUnitTest]
        public async Task LoginOrRegister()
        {
            if (!Client.IsClientLoggedIn()) // If we haven't already logged in...
            {
                try
                {
                    var result = await Client.LoginWithEmailAddressAsync(Client.Settings.TitleId, USER_EMAIL, USER_PASSWORD);
                    playFabId = result.PlayFabId; // Needed for subsequent tests
                }
                catch (PlayFabException myEx)
                {
                    UUnitAssert.True(myEx.Error == PlayFabErrorCode.AccountNotFound);
                }
            }

            if (Client.IsClientLoggedIn())
                return; // Success, already logged in

            // If the setup failed to log in a user, we need to create one.
            var register = await Client.RegisterPlayFabUserAsync(Client.Settings.TitleId, USER_PASSWORD, USER_NAME, USER_EMAIL);
            playFabId = register.PlayFabId; // Needed for subsequent tests

            UUnitAssert.True(Client.IsClientLoggedIn(), "User login failed");
        }

        /// <summary>
        /// CLIENT API
        /// Test that the login call sequence sends the AdvertisingId when set
        /// </summary>
        [UUnitTest]
        public async Task LoginWithAdvertisingId()
        {
            Client.Settings.AdvertisingIdType = PlayFabDefaultSettings.AD_TYPE_ANDROID_ID;
            Client.Settings.AdvertisingIdValue = "PlayFabTestId";

            var login = await Client.LoginWithEmailAddressAsync(Client.Settings.TitleId, USER_EMAIL, USER_PASSWORD);

            if (login.SettingsForUser.NeedsAttribution)
            {
                UUnitAssert.Equals(PlayFabDefaultSettings.AD_TYPE_ANDROID_ID + "_Successful", Client.Settings.AdvertisingIdType);
            }
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary<string, string>, DateTime
        /// </summary>
        [UUnitTest]
        public async Task UserDataApi()
        {
            string TEST_KEY = "testCounter";

            ClientModels.UserDataRecord testCounter;
            int testCounterValueExpected, testCounterValueActual;

            var getData1 = await Client.GetUserDataAsync(new ClientModels.GetUserDataRequest());

            UUnitAssert.NotNull(getData1, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getData1.Data, "UserData should have been retrieved from Api call");

            if (!getData1.Data.TryGetValue(TEST_KEY, out testCounter))
            {
                testCounter = new ClientModels.UserDataRecord();
                testCounter.Value = "0";
            }
            int.TryParse(testCounter.Value, out testCounterValueExpected);
            testCounterValueExpected = (testCounterValueExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateRequest = new ClientModels.UpdateUserDataRequest();
            updateRequest.Data = new Dictionary<string, string>();
            updateRequest.Data[TEST_KEY] = testCounterValueExpected.ToString();

            var update = await Client.UpdateUserDataAsync(updateRequest);

            UUnitAssert.NotNull(update, "UpdateUserData call failed");

            var getData2 = await Client.GetUserDataAsync(new ClientModels.GetUserDataRequest());

            UUnitAssert.NotNull(getData2, "UserData should have been retrieved from Api call");
            UUnitAssert.NotNull(getData2.Data, "UserData should have been retrieved from Api call");

            getData2.Data.TryGetValue(TEST_KEY, out testCounter);
            UUnitAssert.NotNull(testCounter, "The updated UserData was not found in the Api results");
            int.TryParse(testCounter.Value, out testCounterValueActual);
            UUnitAssert.Equals(testCounterValueExpected, testCounterValueActual);

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
        /// Parameter types tested: Dictionary<string, int> 
        /// </summary>
        [UUnitTest]
        public async Task UserStatisticsApi()
        {
            int testStatExpected, testStatActual;

            var getStat1 = await Client.GetUserStatisticsAsync();

            UUnitAssert.NotNull(getStat1, "UserStatistics should have been retrieved from Api call");

            if (!getStat1.TryGetValue(TEST_STAT_NAME, out testStatExpected))
                testStatExpected = TEST_STAT_BASE;
            testStatExpected = ((testStatExpected + 1) % TEST_STAT_BASE) + TEST_STAT_BASE; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            var updateRequest = new ClientModels.UpdateUserStatisticsRequest();
            updateRequest.UserStatistics = new Dictionary<string, int>();
            updateRequest.UserStatistics[TEST_STAT_NAME] = testStatExpected;

            bool failed = false;
            string failedMessage = "UpdateStatistics should have failed";

            try
            {
                await Client.UpdateUserStatisticsAsync(updateRequest);
            }
            catch (PlayFabException myEx)
            {
                failed = true;
                failedMessage = myEx.Message;
            }

            // Test update result - no data returned, so error or no error, based on Title settings
            if (!TITLE_CAN_UPDATE_SETTINGS)
            {
                UUnitAssert.True(failed, failedMessage);
            }
            else
            {
                UUnitAssert.False(failed, failedMessage);
            }

            var getStat2 = await Client.GetUserStatisticsAsync();

            UUnitAssert.NotNull(getStat2, "UserStatistics should have been retrieved from Api call");
            getStat2.TryGetValue(TEST_STAT_NAME, out testStatActual);
            UUnitAssert.Equals(testStatExpected, testStatActual);
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        [UUnitTest]
        public async Task UserCharacter()
        {
            var getChars = await Server.GetAllUsersCharactersAsync(playFabId);

            UUnitAssert.NotNull(getChars, "Failed to GetChars");

            ServerModels.CharacterResult targetCharacter = null;
            foreach (var eachCharacter in getChars)
                if (eachCharacter.CharacterName == CHAR_NAME)
                    targetCharacter = eachCharacter;

            if (targetCharacter == null)
            {
                // Create the targetCharacter since it doesn't exist
                var grantChar = await Server.GrantCharacterToUserAsync(playFabId, CHAR_NAME, CHAR_TEST_TYPE);

                UUnitAssert.NotNull(grantChar, "Grant character failed");

                // Attempt to get characters again
                getChars = await Server.GetAllUsersCharactersAsync(playFabId);

                UUnitAssert.NotNull(getChars, "Failed to GetChars");
                foreach (var eachCharacter in getChars)
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
        public async Task LeaderBoard()
        {
            var clientGetLeaderboard = await Client.GetLeaderboardAroundCurrentUserAsync(TEST_STAT_NAME, 3);

            UUnitAssert.NotNull(clientGetLeaderboard, "Failed to get client leaderboard");
            UUnitAssert.True(clientGetLeaderboard.Count > 0, "Leaderboard does not contain enough entries.");

            var serverGetLeaderboard = await Server.GetLeaderboardAroundCharacterAsync(TEST_STAT_NAME, playFabId, characterId, 3);

            UUnitAssert.NotNull(serverGetLeaderboard, "Failed to get server leaderboard");
            UUnitAssert.True(serverGetLeaderboard.Count > 0, "Leaderboard does not contain enough entries.");
        }

        /// <summary>
        /// CLIENT API
        /// Test that AccountInfo can be requested
        /// Parameter types tested: List of enum-as-strings converted to list of enums
        /// </summary>
        [UUnitTest]
        public async Task AccountInfo()
        {
            var accountInfo = await Client.GetAccountInfoAsync(playFabId);

            UUnitAssert.NotNull(accountInfo, "Failed to get accountInfo");
            UUnitAssert.NotNull(accountInfo.TitleInfo, "Failed to get accountInfo");
            UUnitAssert.NotNull(accountInfo.TitleInfo.Origination, "Failed to get Origination Enum");
            UUnitAssert.True(Enum.IsDefined(typeof(ClientModels.UserOrigination), accountInfo.TitleInfo.Origination.Value), "Origination Enum not valid");
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        [UUnitTest]
        public async Task CloudScript()
        {
            if (string.IsNullOrEmpty(Client.Settings.GetLogicURL()))
            {
                var logicUrl = await Client.GetCloudScriptUrlAsync();

                UUnitAssert.False(string.IsNullOrEmpty(logicUrl), "Failed to get LogicServerURL");
                UUnitAssert.False(string.IsNullOrEmpty(Client.Settings.GetLogicURL()), "Failed to get LogicServerURL");
                UUnitAssert.Equals(logicUrl, Client.Settings.GetLogicURL());
            }

            var cloudResult = await Client.RunCloudScriptAsync("helloWorld");

            UUnitAssert.NotNull(cloudResult, "Failed to Execute CloudScript");
            UUnitAssert.False(string.IsNullOrEmpty(cloudResult.ResultsEncoded), "Failed to Execute CloudScript");

            // Get the helloWorld return message
            JObject jobj = cloudResult.Results as JObject;
            UUnitAssert.NotNull(jobj);
            JToken jtok;
            jobj.TryGetValue("messageValue", out jtok);
            UUnitAssert.NotNull(jtok);
            JValue jval = jtok as JValue;
            UUnitAssert.NotNull(jval);
            string actualMessage = jval.Value as string;
            UUnitAssert.Equals("Hello " + playFabId + "!", actualMessage);
        }

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        [UUnitTest]
        public async Task WriteEvent()
        {
            var request = new WriteClientPlayerEventRequest();
            request.EventName = "ForumPostEvent";
            request.Timestamp = DateTime.UtcNow;
            request.Body = new Dictionary<string, object>();
            request.Body["Subject"] = "My First Post";
            request.Body["Body"] = "My awesome post.";

            var result = await Client.WritePlayerEventAsync(request);
            UUnitAssert.NotNull(result);
        }
    }
}
