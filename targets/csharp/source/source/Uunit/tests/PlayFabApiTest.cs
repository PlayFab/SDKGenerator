#if !DISABLE_PLAYFABCLIENT_API

using PlayFab.ClientModels;
using PlayFab.Internal;
using PlayFab.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
#if !DISABLE_PLAYFABENTITY_API
using PlayFab.AuthenticationModels;
using PlayFab.DataModels;
#endif

namespace PlayFab.UUnit
{
    public class PlayFabApiTest : UUnitTestCase
    {
        private const string TEST_STAT_NAME = "str";
        private const string TEST_DATA_KEY = "testCounter";

        private int _testInteger;

        // Functional
        private static bool TITLE_INFO_SET = false;

        // Fixed values provided from testInputs
        private static TestTitleData testTitleData;

        // Information fetched by appropriate API calls
        private static string entityId;
        private static string entityType;
        public static string PlayFabId;

        private static PlayFabAuthenticationContext authenticationContext1, authenticationContext2, authenticationContext3;

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        public static void SetTitleInfo(TestTitleData testInputs)
        {
            TITLE_INFO_SET = true;
            testTitleData = testInputs;
            // Verify all the inputs won't cause crashes in the tests
            TITLE_INFO_SET &= !string.IsNullOrEmpty(PlayFabSettings.staticSettings.TitleId)
                && !string.IsNullOrEmpty(testTitleData.userEmail);
        }

        public override void SetUp(UUnitTestContext testContext)
        {
            if (!TITLE_INFO_SET)
                testContext.Skip(); // We cannot do client tests if the titleId is not given
        }

        public override void Tick(UUnitTestContext testContext)
        {
            // No work needed, async tests will end themselves
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        [UUnitTest]
        public void InvalidLogin(UUnitTestContext testContext)
        {
            // If the setup failed to log in a user, we need to create one.
            var request = new LoginWithEmailAddressRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                Email = testTitleData.userEmail,
                Password = "INVALID",
            };
            var loginTask = PlayFabClientAPI.LoginWithEmailAddressAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(loginTask, testContext, InvalidLoginContinued, false, "Login should fail", true);
        }
        private void InvalidLoginContinued(PlayFabResult<LoginResult> loginResult, UUnitTestContext testContext, string failMessage)
        {
            testContext.NotNull(loginResult, failMessage);
            testContext.IsNull(loginResult.Result, failMessage);
            testContext.NotNull(loginResult.Error, failMessage);
            testContext.True(loginResult.Error.ErrorMessage.Contains("password"), loginResult.Error.ErrorMessage + ", for: " + testTitleData.userEmail + ", on: " + PlayFabSettings.staticSettings.TitleId);
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a user with an invalid email and password
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        [UUnitTest]
        public void InvalidRegistration(UUnitTestContext testContext)
        {
            var registerRequest = new RegisterPlayFabUserRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                Username = "x",
                Email = "x",
                Password = "x",
            };
            var registerTask = PlayFabClientAPI.RegisterPlayFabUserAsync(registerRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(registerTask, testContext, InvalidRegistrationContinued, false, "Registration should fail", true);
        }
        private void InvalidRegistrationContinued(PlayFabResult<RegisterPlayFabUserResult> registerResult, UUnitTestContext testContext, string failMessage)
        {
            testContext.NotNull(registerResult, failMessage);
            testContext.IsNull(registerResult.Result, failMessage);
            testContext.NotNull(registerResult.Error, failMessage);

            var expectedEmailMsg = "email address is not valid.";
            var expectedPasswordMsg = "password must be between";
            var fullReport = registerResult.Error.GenerateErrorReport();

            testContext.True(fullReport.ToLower().Contains(expectedEmailMsg), "Expected an error about bad email address: " + fullReport);
            testContext.True(fullReport.ToLower().Contains(expectedPasswordMsg), "Expected an error about bad password: " + fullReport);
        }

        /// <summary>
        /// CLIENT API
        /// Log in or create a user, track their PlayFabId
        /// </summary>
        [UUnitTest]
        public void LoginOrRegister(UUnitTestContext testContext)
        {
            var loginRequest = new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                CustomId = PlayFabSettings.BuildIdentifier,
                CreateAccount = true
            };
            var loginTask = PlayFabClientAPI.LoginWithCustomIDAsync(loginRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(loginTask, testContext, LoginOrRegisterContinued, true, "User login failed", true);
        }
        private void LoginOrRegisterContinued(PlayFabResult<LoginResult> loginResult, UUnitTestContext testContext, string failMessage)
        {
            PlayFabId = loginResult.Result.PlayFabId; // Needed for subsequent tests
            testContext.True(PlayFabClientAPI.IsClientLoggedIn(), "User login failed");
        }

        /// <summary>
        /// CLIENT API
        /// Test that the login call sequence sends the AdvertisingId when set
        /// </summary>
        [UUnitTest]
        public void LoginWithAdvertisingId(UUnitTestContext testContext)
        {
            PlayFabSettings.staticSettings.AdvertisingIdType = PlayFabSettings.AD_TYPE_ANDROID_ID;
            PlayFabSettings.staticSettings.AdvertisingIdValue = "PlayFabTestId";

            var loginRequest = new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                CustomId = PlayFabSettings.BuildIdentifier,
                CreateAccount = true
            };
            var loginTask = PlayFabClientAPI.LoginWithCustomIDAsync(loginRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(loginTask, testContext, LoginWithAdvertisingIdContinued, true, "Login with advertId failed", true);
        }
        private void LoginWithAdvertisingIdContinued(PlayFabResult<LoginResult> loginResult, UUnitTestContext testContext, string failMessage)
        {
            PlayFabId = loginResult.Result.PlayFabId; // Needed for subsequent tests
            testContext.True(PlayFabClientAPI.IsClientLoggedIn(), "User login failed");

            testContext.StringEquals(PlayFabSettings.AD_TYPE_ANDROID_ID + "_Successful", PlayFabSettings.staticSettings.AdvertisingIdType);
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary&gt;string, string>, DateTime
        /// </summary>
        [UUnitTest]
        public void UserDataApi(UUnitTestContext testContext)
        {
            var getRequest = new GetUserDataRequest();
            var getDataTask1 = PlayFabClientAPI.GetUserDataAsync(getRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(getDataTask1, testContext, UserDataApiContinued1, true, "GetUserData1 call failed", false);
        }
        private void UserDataApiContinued1(PlayFabResult<GetUserDataResult> getDataResult1, UUnitTestContext testContext, string failMessage)
        {
            UserDataRecord testCounter;
            if (!getDataResult1.Result.Data.TryGetValue(TEST_DATA_KEY, out testCounter))
                testCounter = new UserDataRecord { Value = "0" };
            int.TryParse(testCounter.Value, out _testInteger);
            _testInteger = (_testInteger + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateRequest = new UpdateUserDataRequest { Data = new Dictionary<string, string> { { TEST_DATA_KEY, _testInteger.ToString() } } };
            var updateTask = PlayFabClientAPI.UpdateUserDataAsync(updateRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(updateTask, testContext, UserDataApiContinued2, true, "UpdateUserData call failed", false); // The update doesn't return anything interesting except versionID.  It's better to just re-call GetUserData again below to verify the update
        }
        private void UserDataApiContinued2(PlayFabResult<UpdateUserDataResult> updateResult, UUnitTestContext testContext, string failMessage)
        {
            var getRequest = new GetUserDataRequest();
            var getDataTask2 = PlayFabClientAPI.GetUserDataAsync(getRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(getDataTask2, testContext, UserDataApiContinued3, true, "GetUserData2 call failed", true);
        }
        private void UserDataApiContinued3(PlayFabResult<GetUserDataResult> getDataResult2, UUnitTestContext testContext, string failMessage)
        {
            int testCounterValueActual;
            UserDataRecord testCounter;
            getDataResult2.Result.Data.TryGetValue(TEST_DATA_KEY, out testCounter);
            testContext.NotNull(testCounter, "The updated UserData was not found in the Api results");
            int.TryParse(testCounter.Value, out testCounterValueActual);
            testContext.IntEquals(_testInteger, testCounterValueActual);

            var timeUpdated = testCounter.LastUpdated;
            var testMin = DateTime.UtcNow - TimeSpan.FromMinutes(5);
            var testMax = testMin + TimeSpan.FromMinutes(10);
            testContext.True(testMin <= timeUpdated && timeUpdated <= testMax);
        }


        /// <summary>
        /// CLIENT API
        /// Tests several parallel requests and ensures they complete with no errors.
        /// </summary>
        [UUnitTest]
        public void ParallelRequests(UUnitTestContext testContext)
        {
            var tasks = Enumerable.Range(0, 10)
                .Select(_ => PlayFabClientAPI.GetUserDataAsync(new GetUserDataRequest(), _, testTitleData.extraHeaders))
                .Select(ThrowIfApiError);

            Task.WhenAll(tasks).ContinueWith(whenAll =>
            {
                if (!whenAll.IsCanceled && !whenAll.IsFaulted)
                {
                    testContext.EndTest(UUnitFinishState.PASSED, null);
                }
                else
                {
                    testContext.Fail("Parallel Requests failed " + whenAll.Exception.Flatten().Message);
                }
            });
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is saved correctly, and that specific types are tested
        /// Parameter types tested: Dictionary&gt;string, int>
        /// </summary>
        [UUnitTest]
        public void PlayerStatisticsApi(UUnitTestContext testContext)
        {
            var getRequest = new GetPlayerStatisticsRequest();
            var getStatTask1 = PlayFabClientAPI.GetPlayerStatisticsAsync(getRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(getStatTask1, testContext, PlayerStatisticsApiContinued1, true, "GetPlayerStatistics1 call failed", false);
        }
        private void PlayerStatisticsApiContinued1(PlayFabResult<GetPlayerStatisticsResult> getStatResult1, UUnitTestContext testContext, string failMessage)
        {
            foreach (var eachStat in getStatResult1.Result.Statistics)
                if (eachStat.StatisticName == TEST_STAT_NAME)
                    _testInteger = eachStat.Value;
            _testInteger = (_testInteger + 1) % 100; // This test is about the expected value changing (incrementing through from TEST_STAT_BASE to TEST_STAT_BASE * 2 - 1)

            var updateRequest = new UpdatePlayerStatisticsRequest { Statistics = new List<StatisticUpdate> { new StatisticUpdate { StatisticName = TEST_STAT_NAME, Value = _testInteger } } };
            var updateTask = PlayFabClientAPI.UpdatePlayerStatisticsAsync(updateRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(updateTask, testContext, PlayerStatisticsApiContinued2, true, "UpdatePlayerStatistics call failed", false);
        }
        private void PlayerStatisticsApiContinued2(PlayFabResult<UpdatePlayerStatisticsResult> updateResult, UUnitTestContext testContext, string failMessage)
        {
            var getRequest = new GetPlayerStatisticsRequest();
            var getStatTask2 = PlayFabClientAPI.GetPlayerStatisticsAsync(getRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(getStatTask2, testContext, PlayerStatisticsApiContinued3, true, "GetPlayerStatistics2 call failed", true);
        }
        private void PlayerStatisticsApiContinued3(PlayFabResult<GetPlayerStatisticsResult> getStatResult2, UUnitTestContext testContext, string failMessage)
        {
            var testStatActual = int.MinValue;
            foreach (var eachStat in getStatResult2.Result.Statistics)
                if (eachStat.StatisticName == TEST_STAT_NAME)
                    testStatActual = eachStat.Value;
            testContext.IntEquals(_testInteger, testStatActual);
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        [UUnitTest]
        public void UserCharacter(UUnitTestContext testContext)
        {
            var request = new ListUsersCharactersRequest { PlayFabId = PlayFabId };
            var getCharsTask = PlayFabClientAPI.GetAllUsersCharactersAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(getCharsTask, testContext, null, true, "Failed to GetChars", true);
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        [UUnitTest]
        public void LeaderBoard(UUnitTestContext testContext)
        {
            var clientRequest = new GetLeaderboardRequest
            {
                MaxResultsCount = 3,
                StatisticName = TEST_STAT_NAME,
            };
            var clientTask = PlayFabClientAPI.GetLeaderboardAsync(clientRequest, null, testTitleData.extraHeaders);
            ContinueWithContext(clientTask, testContext, LeaderBoardContinued, true, "Failed to get client leaderboard", true);
        }
        private void LeaderBoardContinued(PlayFabResult<GetLeaderboardResult> clientResult, UUnitTestContext testContext, string failMessage)
        {
            testContext.True(clientResult.Result.Leaderboard.Count > 0, "Leaderboard does not contain enough entries.");
        }

        /// <summary>
        /// CLIENT API
        /// Test that AccountInfo can be requested
        /// Parameter types tested: List of enum-as-strings converted to list of enums
        /// </summary>
        [UUnitTest]
        public void AccountInfo(UUnitTestContext testContext)
        {
            var request = new GetAccountInfoRequest { PlayFabId = PlayFabId };
            var accountTask = PlayFabClientAPI.GetAccountInfoAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(accountTask, testContext, LeaderBoardContinued, true, "Failed to get accountInfo", true);
        }
        private void LeaderBoardContinued(PlayFabResult<GetAccountInfoResult> accountResult, UUnitTestContext testContext, string failMessage)
        {
            testContext.True(Enum.IsDefined(typeof(UserOrigination), accountResult.Result.AccountInfo.TitleInfo.Origination.Value), "Origination Enum not valid");
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        [UUnitTest]
        public void CloudScript(UUnitTestContext testContext)
        {
            var request = new ClientModels.ExecuteCloudScriptRequest { FunctionName = "helloWorld" };
            var cloudTask = PlayFabClientAPI.ExecuteCloudScriptAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(cloudTask, testContext, CloudScriptContinued, true, "Failed to Execute CloudScript", true);
        }
        private void CloudScriptContinued(PlayFabResult<ClientModels.ExecuteCloudScriptResult> cloudResult, UUnitTestContext testContext, string failMessage)
        {
            string messageValue = null;
            // Get the helloWorld return message
            testContext.NotNull(cloudResult.Result.FunctionResult);
            var sjobj = cloudResult.Result.FunctionResult as JsonObject;
            if (sjobj != null)
                messageValue = sjobj["messageValue"] as string;
            //var njobj = cloudResult.Result.FunctionResult as Newtonsoft.Json.Linq.JObject;
            //if (njobj != null)
            //    messageValue = njobj["messageValue"].ToObject<string>();
            testContext.StringEquals("Hello " + PlayFabId + "!", messageValue);
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript errors can be deciphered
        /// </summary>
        [UUnitTest]
        public void CloudScriptError(UUnitTestContext testContext)
        {
            var request = new ClientModels.ExecuteCloudScriptRequest { FunctionName = "throwError" };
            var cloudTask = PlayFabClientAPI.ExecuteCloudScriptAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(cloudTask, testContext, CloudScriptErrorContinued, true, "Failed to Execute CloudScript", true);
        }
        private void CloudScriptErrorContinued(PlayFabResult<ClientModels.ExecuteCloudScriptResult> cloudResult, UUnitTestContext testContext, string failMessage)
        {
            // Get the JavascriptException result
            testContext.IsNull(cloudResult.Result.FunctionResult);
            testContext.NotNull(cloudResult.Result.Error);
            testContext.StringEquals(cloudResult.Result.Error.Error, "JavascriptException");
        }

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        [UUnitTest]
        public void WriteEvent(UUnitTestContext testContext)
        {
            var request = new WriteClientPlayerEventRequest
            {
                EventName = "ForumPostEvent",
                Timestamp = DateTime.UtcNow,
                Body = new Dictionary<string, object> {
                    { "Subject", "My First Post" },
                    { "Body", "My awesome Post." },
                }
            };

            var writeTask = PlayFabClientAPI.WritePlayerEventAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(writeTask, testContext, null, true, "PlayStream WriteEvent failed", true);
        }

#if !DISABLE_PLAYFABENTITY_API
        /// <summary>
        /// ENTITY API
        /// Get the EntityToken for the client player
        /// </summary>
        [UUnitTest]
        public void GetEntityToken(UUnitTestContext testContext)
        {
            var writeTask = PlayFabAuthenticationAPI.GetEntityTokenAsync(new GetEntityTokenRequest(), null, testTitleData.extraHeaders);
            ContinueWithContext(writeTask, testContext, GetEntityTokenContinued, true, "GetEntityToken failed", true);
        }
        private void GetEntityTokenContinued(PlayFabResult<GetEntityTokenResponse> result, UUnitTestContext testContext, string failMessage)
        {
            entityId = result.Result.Entity.Id;
            entityType = result.Result.Entity.Type;
        }

        /// <summary>
        /// ENTITY API
        /// Test a sequence of calls that modifies entity objects,
        ///   and verifies that the next sequential API call contains updated info.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary&lt;string, string>, DateTime
        /// </summary>
        [UUnitTest]
        public void ObjectApi(UUnitTestContext testContext)
        {
            var request = new GetObjectsRequest
            {
                Entity = new DataModels.EntityKey
                {
                    Id = entityId,
                    Type = entityType,
                },
                EscapeObject = true
            };
            var eachTask = PlayFabDataAPI.GetObjectsAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(eachTask, testContext, GetObjects1Continued, true, "GetObjects1 failed", false);
        }
        private void GetObjects1Continued(PlayFabResult<GetObjectsResponse> result, UUnitTestContext testContext, string failMessage)
        {
            // testContext.IntEquals(result.Result.Objects.Count, 1);
            // testContext.StringEquals(result.Result.Objects[0].ObjectName, TEST_DATA_KEY);

            _testInteger = 0;
            if (result.Result.Objects.Count == 1 && result.Result.Objects[TEST_DATA_KEY].ObjectName == TEST_DATA_KEY)
                int.TryParse(result.Result.Objects[TEST_DATA_KEY].EscapedDataObject, out _testInteger);

            var request = new SetObjectsRequest
            {
                Entity = new DataModels.EntityKey
                {
                    Id = entityId,
                    Type = entityType,
                },
                Objects = new List<SetObject>
                {
                    new SetObject
                    {
                        DataObject = _testInteger,
                        ObjectName = TEST_DATA_KEY
                    }
                }
            };
            var eachTask = PlayFabDataAPI.SetObjectsAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(eachTask, testContext, SetObjectsContinued, true, "SetObjects failed", false);
        }
        private void SetObjectsContinued(PlayFabResult<SetObjectsResponse> result, UUnitTestContext testContext, string failMessage)
        {
            var request = new GetObjectsRequest
            {
                Entity = new DataModels.EntityKey
                {
                    Id = entityId,
                    Type = entityType,
                },
                EscapeObject = true
            };
            var eachTask = PlayFabDataAPI.GetObjectsAsync(request, null, testTitleData.extraHeaders);
            ContinueWithContext(eachTask, testContext, GetObjects2Continued, true, "GetObjects2 failed", false);
        }
        private void GetObjects2Continued(PlayFabResult<GetObjectsResponse> result, UUnitTestContext testContext, string failMessage)
        {
            testContext.IntEquals(result.Result.Objects.Count, 1);
            testContext.StringEquals(result.Result.Objects[TEST_DATA_KEY].ObjectName, TEST_DATA_KEY);

            if (!int.TryParse(result.Result.Objects[TEST_DATA_KEY].EscapedDataObject, out int actualValue))
                actualValue = -1000;
            testContext.IntEquals(_testInteger, actualValue, "Failed: " + _testInteger + "!=" + actualValue + ", Returned json: " + result.Result.Objects[TEST_DATA_KEY].EscapedDataObject);
            testContext.EndTest(UUnitFinishState.PASSED, null);
        }
#endif
        /// <summary>
        /// CLIENT API
        /// Test that Multiple login can be done with static methods
        /// </summary>
        [UUnitTest]
        public void MultipleLoginWithStaticMethods(UUnitTestContext testContext)
        {
            // If the setup failed to log in a user, we need to create one.
            var loginRequest1 = new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                CustomId = "test_SDK1",
                CreateAccount = true,
            };
            var loginRequest2 = new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                CustomId = "test_SDK2",
                CreateAccount = true,
            };
            var loginRequest3 = new LoginWithCustomIDRequest
            {
                TitleId = PlayFabSettings.staticSettings.TitleId,
                CustomId = "test_SDK3",
                CreateAccount = true,
            };

            var loginTask1 = PlayFabClientAPI.LoginWithCustomIDAsync(loginRequest1, null, testTitleData.extraHeaders).Result;
            var loginTask2 = PlayFabClientAPI.LoginWithCustomIDAsync(loginRequest2, null, testTitleData.extraHeaders).Result;
            var loginTask3 = PlayFabClientAPI.LoginWithCustomIDAsync(loginRequest3, null, testTitleData.extraHeaders).Result;

            testContext.NotNull(loginTask1.Result, "Login Result is null for loginRequest1");
            testContext.NotNull(loginTask2.Result, "Login Result is null for loginRequest2");
            testContext.NotNull(loginTask3.Result, "Login Result is null for loginRequest3");
            testContext.IsNull(loginTask1.Error, "Login error occured for loginRequest1: " + loginTask1.Error?.ErrorMessage ?? string.Empty);
            testContext.IsNull(loginTask2.Error, "Login error occured for loginRequest2: " + loginTask2.Error?.ErrorMessage ?? string.Empty);
            testContext.IsNull(loginTask3.Error, "Login error occured for loginRequest3: " + loginTask3.Error?.ErrorMessage ?? string.Empty);
            testContext.NotNull(loginTask1.Result.AuthenticationContext, "AuthenticationContext is not set for loginRequest1,");
            testContext.NotNull(loginTask2.Result.AuthenticationContext, "AuthenticationContext is not set for loginRequest2");
            testContext.NotNull(loginTask3.Result.AuthenticationContext, "AuthenticationContext is not set for loginRequest3");

            if (string.Equals(loginTask1.Result.AuthenticationContext.ClientSessionTicket, loginTask2.Result.AuthenticationContext.ClientSessionTicket))
            {
                testContext.Fail("Multiple Login Failed AuthenticationContexts are same for task1 and task2: " + loginTask1.Result.AuthenticationContext.ClientSessionTicket);
            }
            if (string.Equals(loginTask2.Result.AuthenticationContext.ClientSessionTicket, loginTask3.Result.AuthenticationContext.ClientSessionTicket))
            {
                testContext.Fail("Multiple Login Failed AuthenticationContexts are same for task2 and task3:  " + loginTask2.Result.AuthenticationContext.ClientSessionTicket);
            }
            if (string.Equals(loginTask1.Result.AuthenticationContext.ClientSessionTicket, loginTask3.Result.AuthenticationContext.ClientSessionTicket))
            {
                testContext.Fail("Multiple Login Failed AuthenticationContexts are same for task1 and task3: " + loginTask1.Result.AuthenticationContext.ClientSessionTicket);
            }

            authenticationContext1 = loginTask1.Result.AuthenticationContext;
            authenticationContext2 = loginTask2.Result.AuthenticationContext;
            authenticationContext3 = loginTask3.Result.AuthenticationContext;

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// CLIENT API
        /// Test that Multiple player can do api calls
        /// </summary>
        [UUnitTest]
        public void MultiplePlayerApiCall(UUnitTestContext testContext)
        {
            if (authenticationContext1?.ClientSessionTicket == null || authenticationContext2?.ClientSessionTicket == null)
            {
                testContext.Skip("To run this test MultipleLoginWithStaticMethods test should be passed and store authenticationContext values");
            }

            var getPlayerProfileRequest = new GetPlayerProfileRequest()
            {
                AuthenticationContext = authenticationContext1,
                PlayFabId = PlayFabId
            };
            var getPlayerProfileRequest2 = new GetPlayerProfileRequest()
            {
                AuthenticationContext = authenticationContext2,
                PlayFabId = PlayFabId
            };

            var getPlayerProfileTask = PlayFabClientAPI.GetPlayerProfileAsync(getPlayerProfileRequest, null, testTitleData.extraHeaders).Result;
            var getPlayerProfileTask2 = PlayFabClientAPI.GetPlayerProfileAsync(getPlayerProfileRequest2, null, testTitleData.extraHeaders).Result;

            testContext.NotNull(getPlayerProfileTask.Result, "GetPlayerProfile Failed for getPlayerProfileRequest");
            testContext.NotNull(getPlayerProfileTask2.Result, "GetPlayerProfile Failed for getPlayerProfileRequest2");
            testContext.IsNull(getPlayerProfileTask.Error, "GetPlayerProfile error occured for getPlayerProfileRequest: " + getPlayerProfileTask.Error?.ErrorMessage ?? string.Empty);
            testContext.IsNull(getPlayerProfileTask2.Error, "GetPlayerProfile error occured for getPlayerProfileRequest2: " + getPlayerProfileTask2.Error?.ErrorMessage ?? string.Empty);

            testContext.EndTest(UUnitFinishState.PASSED, null);
        }

        /// <summary>
        /// CLIENT API
        /// Tests async api calls with multiple users
        /// </summary>
        [UUnitTest]
        public void AsyncApiCallWithMultipleUser(UUnitTestContext testContext)
        {
            if (authenticationContext1?.ClientSessionTicket == null || authenticationContext2?.ClientSessionTicket == null || authenticationContext3?.ClientSessionTicket == null)
            {
                testContext.Skip("To run this test MultipleLoginWithStaticMethods test should be passed and store authenticationContext values");
            }

            var task1 = PlayFabClientAPI.GetUserDataAsync(new GetUserDataRequest() { AuthenticationContext = authenticationContext1 }, null, testTitleData.extraHeaders);
            var task2 = PlayFabClientAPI.GetUserDataAsync(new GetUserDataRequest() { AuthenticationContext = authenticationContext2 }, null, testTitleData.extraHeaders);
            var task3 = PlayFabClientAPI.GetUserDataAsync(new GetUserDataRequest() { AuthenticationContext = authenticationContext3 }, null, testTitleData.extraHeaders);

            var tasks = new List<Task>() { task1, task2, task3 };

            Task.WhenAll(tasks).ContinueWith(whenAll =>
            {
                if (!whenAll.IsCanceled && !whenAll.IsFaulted)
                {
                    testContext.EndTest(UUnitFinishState.PASSED, null);
                }
                else
                {
                    testContext.Fail("Async failed " + whenAll.Exception.Flatten().Message);
                }
            });
        }

    }
}
#endif
