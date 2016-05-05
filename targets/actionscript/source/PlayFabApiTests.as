package
{
    import flash.net.*;
    import flash.errors.*;
    import flash.events.*;
    import flash.utils.Timer;

    import com.playfab.ClientModels.*;
    import com.playfab.ServerModels.*;
    import com.playfab.PlayFabClientAPI;
    import com.playfab.PlayFabServerAPI;
    import com.playfab.PlayFabSettings;
    import com.playfab.PlayFabHTTP;
    import com.playfab.PlayFabError;

    import asyncUnitTest.ASyncUnitTestSuite;
    import asyncUnitTest.ASyncUnitTestEvent;
    import asyncUnitTest.ASyncAssert;
    import asyncUnitTest.ASyncUnitTestReporter;
    import asyncUnitTest.ASyncUnitTestFileReporter;

    public class PlayFabApiTests extends ASyncUnitTestSuite
    {
        private static var TITLE_DATA_FILENAME:String;

        private static const TEST_STAT_BASE:int = 10;
        private static const TEST_STAT_NAME:String = "str";
        private static const CHAR_TEST_TYPE:String = "Test";
        private static const TEST_DATA_KEY:String = "testCounter";

        // Functional
        private static var EXEC_ONCE:Boolean = true;
        private static var TITLE_INFO_SET:Boolean = false;
        private static var TITLE_CAN_UPDATE_SETTINGS:Boolean = false;

        // Fixed values provided from testInputs
        private static var USER_NAME:String;
        private static var USER_EMAIL:String;
        private static var USER_PASSWORD:String;
        private static var CHAR_NAME:String;

        // Information fetched by appropriate API calls
        private static var playFabId:String;
        private static var characterId:String;

        // Variables for specific tests
        private var testIntExpected:int;
        private var testIntActual:int;

        public function PlayFabApiTests(titleDataFileName:String, reporter:ASyncUnitTestReporter)
        {
            super(reporter);
            TITLE_DATA_FILENAME = titleDataFileName;

            AddTest("InvalidLogin", InvalidLogin);
            AddTest("InvalidRegistration", InvalidRegistration);
            AddTest("LoginOrRegister", LoginOrRegister);
            AddTest("LoginWithAdvertisingId", LoginWithAdvertisingId);
            AddTest("UserDataApi", UserDataApi);
            AddTest("UserStatisticsApi", UserStatisticsApi);
            AddTest("UserCharacter", UserCharacter);
            AddTest("LeaderBoard", LeaderBoard);
            AddTest("AccountInfo", AccountInfo);
            AddTest("CloudScript", CloudScript);
            AddTest("WriteEvent", WriteEvent);

            KickOffTests();
        }

        override protected function SuiteSetUp() : void
        {
            var myTextLoader:URLLoader = new URLLoader();
            myTextLoader.addEventListener(Event.COMPLETE, Wrap(OnTitleDataLoaded, "TitleData"));
            myTextLoader.load(new URLRequest(TITLE_DATA_FILENAME));
        }

        private function OnTitleDataLoaded(event:Event) : void
        {
            SetTitleInfo(event.target.data);
            SuiteSetUpCompleteHandler();
        }

        /// <summary>
        /// PlayFab Title cannot be created from SDK tests, so you must provide your titleId to run unit tests.
        /// (Also, we don't want lots of excess unused titles)
        /// </summary>
        private static function SetTitleInfo(titleDataString):Boolean
        {
            var testTitleData:Object = JSON.parse(titleDataString);

            PlayFabSettings.TitleId = testTitleData.titleId;
            PlayFabSettings.DeveloperSecretKey = testTitleData.developerSecretKey;
            TITLE_CAN_UPDATE_SETTINGS = testTitleData.titleCanUpdateSettings.toLowerCase() == "true";
            USER_NAME = testTitleData.userName;
            USER_EMAIL = testTitleData.userEmail;
            USER_PASSWORD = testTitleData.userPassword;
            CHAR_NAME = testTitleData.characterName;

            TITLE_INFO_SET = Boolean(PlayFabSettings.TitleId)
                || Boolean(PlayFabSettings.TitleId)
                || Boolean(PlayFabSettings.DeveloperSecretKey)
                || Boolean(TITLE_CAN_UPDATE_SETTINGS)
                || Boolean(USER_NAME)
                || Boolean(USER_EMAIL)
                || Boolean(USER_PASSWORD)
                || Boolean(CHAR_NAME);
            return TITLE_INFO_SET;
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately log in with an inappropriate password,
        ///   and verify that the error displays as expected.
        /// </summary>
        private function InvalidLogin() : void
        {
            var request:com.playfab.ClientModels.LoginWithEmailAddressRequest = new com.playfab.ClientModels.LoginWithEmailAddressRequest();
            request.TitleId = PlayFabSettings.TitleId;
            request.Email = USER_EMAIL;
            request.Password = USER_PASSWORD + "INVALID";
            PlayFabClientAPI.LoginWithEmailAddress(request, Wrap(InvalidLogin_Success, "InvalidLogin_Success"), Wrap(InvalidLogin_Failure, "InvalidLogin_Success"));
        }
        private function InvalidLogin_Success(result:com.playfab.ClientModels.LoginResult) : void
        {
            reporter.Debug("InvalidLogin_Success");
            ASyncAssert.Fail("Login unexpectedly succeeded.");
        }
        private function InvalidLogin_Failure(error:com.playfab.PlayFabError) : void
        {
            ASyncAssert.AssertNotNull(error.errorMessage);
            if(error.errorMessage.toLowerCase().indexOf("password") >= 0)
                FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
            else
                ASyncAssert.Fail("Unexpected error result: " + error.errorMessage);
        }

        private function Shared_ApiCallFailure(error:com.playfab.PlayFabError) : void
        {
            var fullMessage:String = error.errorMessage;
            for (var key:String in error.errorDetails) {
                fullMessage += "\n";
                fullMessage += key + ": " + error.errorDetails[key];
            }
            ASyncAssert.Fail(fullMessage);
        }

        /// <summary>
        /// CLIENT API
        /// Try to deliberately register a character with an invalid email and password.
        ///   Verify that errorDetails are populated correctly.
        /// </summary>
        private function InvalidRegistration() : void
        {
            var registerRequest:com.playfab.ClientModels.RegisterPlayFabUserRequest = new com.playfab.ClientModels.RegisterPlayFabUserRequest();
            registerRequest.TitleId = PlayFabSettings.TitleId;
            registerRequest.Username = USER_NAME; // A username that is already taken
            registerRequest.Email = "invalidEmail"; // An improperly formatted email
            registerRequest.Password = "x"; // A password that is too short
            PlayFabClientAPI.RegisterPlayFabUser(registerRequest, Wrap(InvalidRegistration_Success, "InvalidRegistration_Success"), Wrap(InvalidRegistration_Failure, "InvalidRegistration_Success"));
        }
        private function InvalidRegistration_Success(result:com.playfab.ClientModels.LoginResult) : void
        {
            reporter.Debug("InvalidRegistration_Success");
            ASyncAssert.Fail("Registration unexpectedly succeeded.");
        }
        private function InvalidRegistration_Failure(error:com.playfab.PlayFabError) : void
        {
            ASyncAssert.AssertNotNull(error.errorMessage);
            ASyncAssert.AssertNotNull(error.errorDetails); // This is one of the few messages that actually provide errorDetails
            if(error.errorMessage.toLowerCase().indexOf("invalid input parameters") == -1)
                ASyncAssert.Fail("Unexpected error result: " + error.errorMessage);

            // Find and verify each expected error detail message
            var expectedEmailMsg:String = "Email address is not valid.";
            var expectedPasswordMsg:String = "Password must be between";
            var foundEmailMsg:Boolean = false;
            var foundPasswordMsg:Boolean = false;
            var allMessages:String = "";
            for (var key:String in error.errorDetails) {
                var eachArray:Array = error.errorDetails[key];
                for (var eachIndex:int in eachArray) {
                    if(eachArray[eachIndex].indexOf(expectedEmailMsg) >= 0)
                        foundEmailMsg = true;
                    if(eachArray[eachIndex].indexOf(expectedPasswordMsg) >= 0)
                        foundPasswordMsg = true;
                    allMessages += eachArray[eachIndex];
                }
            }
            ASyncAssert.AssertTrue(foundEmailMsg, "\"" + expectedEmailMsg + "\" not found in: " + allMessages);
            ASyncAssert.AssertTrue(foundPasswordMsg, "\"" + expectedPasswordMsg + "\" not found in: " + allMessages);
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary<string, string>, DateTime
        /// </summary>
        private function LoginOrRegister() : void
        {
            var loginRequest:com.playfab.ClientModels.LoginWithEmailAddressRequest = new com.playfab.ClientModels.LoginWithEmailAddressRequest();
            loginRequest.TitleId = PlayFabSettings.TitleId;
            loginRequest.Email = USER_EMAIL;
            loginRequest.Password = USER_PASSWORD;
            // Try to login, but if we fail, just fall-back and try to create character
            PlayFabClientAPI.LoginWithEmailAddress(loginRequest, Wrap(LoginOrRegister_LoginSuccess, "LoginOrRegister_LoginSuccess"), Wrap(LoginOrRegister_AcceptableFailure, "LoginOrRegister_LoginSuccess"));
        }
        private function LoginOrRegister_LoginSuccess(result:com.playfab.ClientModels.LoginResult) : void
        {
            // Typical success
            playFabId = result.PlayFabId;
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }
        private function LoginOrRegister_AcceptableFailure(error:com.playfab.PlayFabError) : void
        {
            // Acceptable failure - register character and re-attempt
            var registerRequest:com.playfab.ClientModels.RegisterPlayFabUserRequest = new com.playfab.ClientModels.RegisterPlayFabUserRequest();
            registerRequest.TitleId = PlayFabSettings.TitleId;
            registerRequest.Username = USER_NAME;
            registerRequest.Email = USER_EMAIL;
            registerRequest.Password = USER_PASSWORD;
            PlayFabClientAPI.RegisterPlayFabUser(registerRequest, Wrap(LoginOrRegister_RegisterSuccess, "LoginOrRegister_RegisterSuccess"), Wrap(Shared_ApiCallFailure, "LoginOrRegister_RegisterSuccess"));
        }
        private function LoginOrRegister_RegisterSuccess(result:com.playfab.ClientModels.LoginResult) : void
        {
            var loginRequest:com.playfab.ClientModels.LoginWithEmailAddressRequest = new com.playfab.ClientModels.LoginWithEmailAddressRequest();
            loginRequest.TitleId = PlayFabSettings.TitleId;
            loginRequest.Email = USER_EMAIL;
            loginRequest.Password = USER_PASSWORD;
            // Try again, but this time, error on failure
            PlayFabClientAPI.LoginWithEmailAddress(loginRequest, Wrap(LoginOrRegister_LoginSuccess, "LoginOrRegister_LoginSuccess"), Wrap(Shared_ApiCallFailure, "LoginOrRegister_LoginSuccess"));
        }

        /// <summary>
        /// CLIENT API
        /// Test that the login call sequence sends the AdvertisingId when set
        /// </summary>
        private function LoginWithAdvertisingId() : void
        {
            PlayFabSettings.AdvertisingIdType = PlayFabSettings.AD_TYPE_ANDROID_ID;
            PlayFabSettings.AdvertisingIdValue = "PlayFabTestId";

            var loginRequest:com.playfab.ClientModels.LoginWithEmailAddressRequest = new com.playfab.ClientModels.LoginWithEmailAddressRequest();
            loginRequest.TitleId = PlayFabSettings.TitleId;
            loginRequest.Email = USER_EMAIL;
            loginRequest.Password = USER_PASSWORD;
            // Try to login, but if we fail, just fall-back and try to create character
            PlayFabClientAPI.LoginWithEmailAddress(loginRequest, Wrap(LoginWithAdvertisingId_LoginSuccess, "LoginWithAdvertisingId_LoginSuccess"), Wrap(Shared_ApiCallFailure, "LoginWithAdvertisingId_LoginSuccess"));
            function RecursiveWrap():void { CheckAdvertIdSuccess(-1); }
            Wrap(RecursiveWrap, "RecursiveWrap_First")(); // ODD SYNTAX HERE: Wrap returns a function, which we then need to call.  Normally the wrap-return is passed in as a callback, which gets called by the sdk, or a utility.
        }
        private function LoginWithAdvertisingId_LoginSuccess(result:com.playfab.ClientModels.LoginResult) : void
        {
            // Typical success
            playFabId = result.PlayFabId;
        }
        private function CheckAdvertIdSuccess(count:Number) : void
        {
            TickTestHandler();
            if (count > 20) // count is the number of attempts to test the successful send of the AdvertisingId.  It needs to be high enough to guarantee regular-case success, but low enough to fail within a reasonable time-limit
            {
                ASyncAssert.Fail("AdvertisingId not sent properly: " + PlayFabSettings.AdvertisingIdType);
            }
            else if (PlayFabSettings.AdvertisingIdType == PlayFabSettings.AD_TYPE_ANDROID_ID + "_Successful") // Base case, success!
            {
                FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
            }
            else
            {
                function RecursiveWrap():void { CheckAdvertIdSuccess(count + 1); }

                var timer:Timer = new Timer(50, 1); // timer takes a delay, which in this case re-tests the successful send of the AdvertisingId.  It needs to be high enough to guarantee regular-case success, but low enough to fail within a reasonable time-limit
                timer.addEventListener(TimerEvent.TIMER, Wrap(RecursiveWrap, "RecursiveWrap_" + count));
                timer.start();
            }
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is correctly modified on the next call.
        /// Parameter types tested: string, Dictionary<string, string>, DateTime
        /// </summary>
        private function UserDataApi() : void
        {
            var getRequest:com.playfab.ClientModels.GetUserDataRequest = new com.playfab.ClientModels.GetUserDataRequest();
            PlayFabClientAPI.GetUserData(getRequest, Wrap(UserDataApi_GetSuccess1, "UserDataApi_GetSuccess1"), Wrap(Shared_ApiCallFailure, "UserDataApi_GetSuccess1"));
        }
        private function UserDataApi_GetSuccess1(result:com.playfab.ClientModels.GetUserDataResult) : void
        {
            testIntExpected = result.Data.hasOwnProperty(TEST_DATA_KEY) ? int(result.Data[TEST_DATA_KEY].Value) : 1;
            testIntExpected = (testIntExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateRequest:com.playfab.ClientModels.UpdateUserDataRequest = new com.playfab.ClientModels.UpdateUserDataRequest();
            updateRequest.Data = new Object();
            updateRequest.Data[TEST_DATA_KEY] = String(testIntExpected);
            PlayFabClientAPI.UpdateUserData(updateRequest, Wrap(UserDataApi_UpdateSuccess, "UserDataApi_UpdateSuccess"), Wrap(Shared_ApiCallFailure, "UserDataApi_UpdateSuccess"));
        }
        private function UserDataApi_UpdateSuccess(result:com.playfab.ClientModels.UpdateUserDataResult) : void
        {
            var getRequest:com.playfab.ClientModels.GetUserDataRequest = new com.playfab.ClientModels.GetUserDataRequest();
            PlayFabClientAPI.GetUserData(getRequest, Wrap(UserDataApi_GetSuccess2, "UserDataApi_GetSuccess2"), Wrap(Shared_ApiCallFailure, "UserDataApi_GetSuccess2"));
        }
        private function UserDataApi_GetSuccess2(result:com.playfab.ClientModels.GetUserDataResult) : void
        {
            testIntActual = int(result.Data[TEST_DATA_KEY].Value);
            ASyncAssert.AssertEquals(testIntExpected, testIntActual);

            var timeUpdated:Date = result.Data[TEST_DATA_KEY].LastUpdated; // This is automatically converted into a local time in AS3
            var now:Date = new Date();
            var testMin:Date = new Date(now.getTime() - (5*60*1000));
            var testMax:Date = new Date(now.getTime() + (5*60*1000));
            ASyncAssert.AssertTrue(testMin <= timeUpdated && timeUpdated <= testMax, testMin.toString() + " !< " + timeUpdated.toString() + " !< " + testMax.toString());
            
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// CLIENT API
        /// Test a sequence of calls that modifies saved data,
        ///   and verifies that the next sequential API call contains updated data.
        /// Verify that the data is saved correctly, and that specific types are tested
        /// Parameter types tested: Dictionary<string, int>
        /// </summary>
        private function UserStatisticsApi() : void
        {
            var getRequest:com.playfab.ClientModels.GetUserStatisticsRequest = new com.playfab.ClientModels.GetUserStatisticsRequest();
            PlayFabClientAPI.GetUserStatistics(getRequest, Wrap(UserStatisticsApi_GetSuccess1, "UserStatisticsApi_GetSuccess1"), Wrap(Shared_ApiCallFailure, "UserStatisticsApi_GetSuccess1"));
        }
        private function UserStatisticsApi_GetSuccess1(result:com.playfab.ClientModels.GetUserStatisticsResult) : void
        {
            testIntExpected = int(result.UserStatistics[TEST_STAT_NAME]);
            testIntExpected = (testIntExpected + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateRequest:com.playfab.ClientModels.UpdateUserStatisticsRequest = new com.playfab.ClientModels.UpdateUserStatisticsRequest();
            updateRequest.UserStatistics = new Object();
            updateRequest.UserStatistics[TEST_STAT_NAME] = testIntExpected;
            PlayFabClientAPI.UpdateUserStatistics(updateRequest, Wrap(UserStatisticsApi_UpdateSuccess, "UserStatisticsApi_UpdateSuccess"), Wrap(Shared_ApiCallFailure, "UserStatisticsApi_UpdateSuccess"));
        }
        private function UserStatisticsApi_UpdateSuccess(result:com.playfab.ClientModels.UpdateUserStatisticsResult) : void
        {
            var getRequest:com.playfab.ClientModels.GetUserStatisticsRequest = new com.playfab.ClientModels.GetUserStatisticsRequest();
            PlayFabClientAPI.GetUserStatistics(getRequest, Wrap(UserStatisticsApi_GetSuccess2, "UserStatisticsApi_GetSuccess2"), Wrap(Shared_ApiCallFailure, "UserStatisticsApi_GetSuccess2"));
        }
        private function UserStatisticsApi_GetSuccess2(result:com.playfab.ClientModels.GetUserStatisticsResult) : void
        {
            testIntActual = int(result.UserStatistics[TEST_STAT_NAME]);

            ASyncAssert.AssertEquals(testIntExpected, testIntActual);
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// SERVER API
        /// Get or create the given test character for the given user
        /// Parameter types tested: Contained-Classes, string
        /// </summary>
        private function UserCharacter() : void
        {
            var getRequest:com.playfab.ServerModels.ListUsersCharactersRequest = new com.playfab.ServerModels.ListUsersCharactersRequest();
            getRequest.PlayFabId = playFabId;
            PlayFabServerAPI.GetAllUsersCharacters(getRequest, Wrap(UserCharacter_GetSuccess1, "UserCharacter_GetSuccess1"), Wrap(Shared_ApiCallFailure, "UserCharacter_GetSuccess1"));
        }
        private function UserCharacter_GetSuccess1(result:com.playfab.ServerModels.ListUsersCharactersResult) : void
        {
            for each(var eachCharacter:com.playfab.ServerModels.CharacterResult in result.Characters)
                if (eachCharacter.CharacterName == CHAR_NAME)
                    characterId = eachCharacter.CharacterId;

            if (characterId)
            {
                // Character is defined and found, success
                FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
            }
            else
            {
                // Character not found, create it
                var grantRequest:com.playfab.ServerModels.GrantCharacterToUserRequest = new com.playfab.ServerModels.GrantCharacterToUserRequest();
                grantRequest.PlayFabId = playFabId;
                grantRequest.CharacterName = CHAR_NAME;
                grantRequest.CharacterType = CHAR_TEST_TYPE;
                PlayFabServerAPI.GrantCharacterToUser(grantRequest, Wrap(UserCharacter_RegisterSuccess, "UserCharacter_RegisterSuccess"), Wrap(Shared_ApiCallFailure, "UserCharacter_RegisterSuccess"));
            }
        }
        private function UserCharacter_RegisterSuccess(result:com.playfab.ServerModels.GrantCharacterToUserResult) : void
        {
            var getRequest:com.playfab.ServerModels.ListUsersCharactersRequest = new com.playfab.ServerModels.ListUsersCharactersRequest();
            getRequest.PlayFabId = playFabId;
            PlayFabServerAPI.GetAllUsersCharacters(getRequest, Wrap(UserCharacter_GetSuccess2, "UserCharacter_GetSuccess2"), Wrap(Shared_ApiCallFailure, "UserCharacter_GetSuccess2"));
        }
        private function UserCharacter_GetSuccess2(result:com.playfab.ServerModels.ListUsersCharactersResult) : void
        {
            for each(var eachCharacter:com.playfab.ServerModels.CharacterResult in result.Characters)
                if (eachCharacter.CharacterName == CHAR_NAME)
                    characterId = eachCharacter.CharacterId;

            ASyncAssert.AssertTrue(characterId, "Character not found, " + result.Characters.length + ", " + playFabId);
            // Character is defined and found, success
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// CLIENT AND SERVER API
        /// Test that leaderboard results can be requested
        /// Parameter types tested: List of contained-classes
        /// </summary>
        private function LeaderBoard() : void
        {
            var clientRequest:com.playfab.ClientModels.GetLeaderboardRequest = new com.playfab.ClientModels.GetLeaderboardRequest();
            clientRequest.MaxResultsCount = 3;
            clientRequest.StatisticName = TEST_STAT_NAME;
            PlayFabClientAPI.GetLeaderboard(clientRequest, Wrap(GetClientLbCallback, "GetClientLbCallback"), Wrap(Shared_ApiCallFailure, "GetClientLbCallback"));
        }
        private function GetClientLbCallback(result:com.playfab.ClientModels.GetLeaderboardResult) : void
        {
            if (result.Leaderboard.length == 0)
                ASyncAssert.Fail("Client leaderboard results not found");

            var serverRequest:com.playfab.ServerModels.GetLeaderboardRequest = new com.playfab.ServerModels.GetLeaderboardRequest();
            serverRequest.MaxResultsCount = 3;
            serverRequest.StatisticName = TEST_STAT_NAME;
            PlayFabServerAPI.GetLeaderboard(serverRequest, Wrap(GetServerLbCallback, "GetServerLbCallback"), Wrap(Shared_ApiCallFailure, "GetServerLbCallback"));
        }
        private function GetServerLbCallback(result:com.playfab.ServerModels.GetLeaderboardResult) : void
        {
            if (result.Leaderboard.length == 0)
                ASyncAssert.Fail("Server leaderboard results not found");

            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// CLIENT API
        /// Test that AccountInfo can be requested
        /// Parameter types tested: List of enum-as-strings converted to list of enums
        /// </summary>
        private function AccountInfo() : void
        {
            var request:com.playfab.ClientModels.GetAccountInfoRequest = new com.playfab.ClientModels.GetAccountInfoRequest();
            PlayFabClientAPI.GetAccountInfo(request, Wrap(GetInfoCallback, "GetInfoCallback"), Wrap(Shared_ApiCallFailure, "GetInfoCallback"));
        }
        private function GetInfoCallback(result:com.playfab.ClientModels.GetAccountInfoResult) : void
        {
            ASyncAssert.AssertNotNull(result.AccountInfo);
            ASyncAssert.AssertNotNull(result.AccountInfo.TitleInfo);
            ASyncAssert.AssertNotNull(result.AccountInfo.TitleInfo.Origination);
            ASyncAssert.AssertTrue(result.AccountInfo.TitleInfo.Origination.length > 0); // This is not a string-enum in AS3, so this test is a bit pointless

            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }

        /// <summary>
        /// CLIENT API
        /// Test that CloudScript can be properly set up and invoked
        /// </summary>
        private function CloudScript() : void
		{
            if (!PlayFabSettings.LogicServerURL)
            {
				var urlRequest:com.playfab.ClientModels.GetCloudScriptUrlRequest = new com.playfab.ClientModels.GetCloudScriptUrlRequest();
                PlayFabClientAPI.GetCloudScriptUrl(urlRequest, Wrap(GetCloudUrlCallback, "GetCloudUrlCallback"), Wrap(Shared_ApiCallFailure, "GetCloudUrlCallback"));
            }
			else
			{
				CallHelloWorldCloudScript();
			}
		}
		private function GetCloudUrlCallback(result:com.playfab.ClientModels.GetCloudScriptUrlResult) : void
		{
			ASyncAssert.AssertTrue(result.Url.length > 0);
			CallHelloWorldCloudScript();
		}
		private function CallHelloWorldCloudScript() : void
		{
			var hwRequest:com.playfab.ClientModels.RunCloudScriptRequest = new com.playfab.ClientModels.RunCloudScriptRequest();
            hwRequest.ActionId = "helloWorld";
            PlayFabClientAPI.RunCloudScript(hwRequest, Wrap(CloudScriptHWCallback, "CloudScriptHWCallback"), Wrap(Shared_ApiCallFailure, "CloudScriptHWCallback"));
			
            //UUnitAssert.Equals("Hello " + playFabId + "!", lastReceivedMessage);
		}
		private function CloudScriptHWCallback(result:com.playfab.ClientModels.RunCloudScriptResult) : void
		{
			ASyncAssert.AssertTrue(result.ResultsEncoded.length > 0);
			ASyncAssert.AssertEquals(result.Results.messageValue, "Hello " + playFabId + "!");

            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
		}

        /// <summary>
        /// CLIENT API
        /// Test that the client can publish custom PlayStream events
        /// </summary>
        private function WriteEvent() : void
        {
            var request:com.playfab.ClientModels.WriteClientPlayerEventRequest = new com.playfab.ClientModels.WriteClientPlayerEventRequest();
            request.EventName = "ForumPostEvent";
            request.Body = new Object();
            request.Body["Subject"] = "My First Post";
            request.Body["Body"] = "My awesome post.";

            PlayFabClientAPI.WritePlayerEvent(request, Wrap(WriteEventCallback, "WriteEventCallback"), Wrap(Shared_ApiCallFailure, "WriteEventCallback"));
        }
        private function WriteEventCallback(result:com.playfab.ClientModels.WriteEventResponse) : void
        {
            FinishTestHandler(new ASyncUnitTestEvent(ASyncUnitTestEvent.FINISH_TEST, ASyncUnitTestEvent.RESULT_PASSED, ""));
        }
    }
}
