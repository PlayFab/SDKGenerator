declare var QUnit: any;
declare var $: any;
interface IAction { (any): void }

var PlayFabApiTests = {
    testTitleDataFilename: "testTitleData.json", // Since you never want this to be public, a web page can ONLY load this if it's a local file in the same directory (Also can't convert to environment variable)
    testRetryDelay: 250,
    testRetryCount: 8,
    titleData: {
        titleId: null, // put titleId here
        developerSecretKey: null, // put secretKey here
        userEmail: "put valid email associated with an existing account here",
        extraHeaders: {}
    },
    testData: {
        entityToken: null, // Entity-Login: filled after login
        entityId: null, // Entity-Login: filled after login
        entityType: null, // Entity-Login: filled after login
        playFabId: null, // Client-Login: filled during login
        testNumber: null, // Arbitrary counter, used by several tests
    },
    testConstants: {
        TEST_DATA_KEY: "testCounter",
        TEST_STAT_NAME: "str"
    },

    ManualExecution: function (): void {
        $.getJSON(PlayFabApiTests.testTitleDataFilename, function (json): void {
            if (PlayFabApiTests.SetUp(json))
                PlayFabApiTests.LoginTests();
        }).fail(function (): void {
            if (PlayFabApiTests.SetUp(PlayFabApiTests.titleData))
                PlayFabApiTests.LoginTests();
        });
    },

    LoginTests: function (): void {
        // All tests run in parallel, which is a bit tricky.
        //   Some test rely on data loaded from other tests, and there's no super easy to force tests to be sequential/dependent
        //   In fact, most of the tests return here before they're done, and report back success/fail in some arbitrary future

        QUnit.module("PlayFab Api Test");
        QUnit.test("InvalidLogin", PlayFabApiTests.InvalidLogin);
        QUnit.test("InvalidRegistration", PlayFabApiTests.InvalidRegistration);
        QUnit.test("LoginOrRegister", PlayFabApiTests.LoginOrRegister);

        setTimeout(function (): void { PlayFabApiTests.PostLoginTests(0); }, PlayFabApiTests.testRetryDelay);
        setTimeout(function (): void { PlayFabApiTests.PostEntityTokenTests(0); }, PlayFabApiTests.testRetryDelay);
    },

    PostLoginTests: function (count): void {
        if (count > PlayFabApiTests.testRetryCount)
            return;

        if (!PlayFabClientSDK.IsClientLoggedIn()) {
            // Wait for login
            setTimeout(function (): void { PlayFabApiTests.PostLoginTests(count + 1); }, PlayFabApiTests.testRetryDelay);
        } else {
            // Continue with other tests that require login
            QUnit.test("GetEntityToken", PlayFabApiTests.GetEntityToken);
            QUnit.test("EntityObjects", PlayFabApiTests.EntityObjects);
            QUnit.test("UserDataApi", PlayFabApiTests.UserDataApi);
            QUnit.test("PlayerStatisticsApi", PlayFabApiTests.PlayerStatisticsApi);
            QUnit.test("UserCharacter", PlayFabApiTests.UserCharacter);
            QUnit.test("LeaderBoard", PlayFabApiTests.LeaderBoard);
            QUnit.test("AccountInfo", PlayFabApiTests.AccountInfo);
            QUnit.test("CloudScript", PlayFabApiTests.CloudScript);
            QUnit.test("CloudScriptError", PlayFabApiTests.CloudScriptError);
            QUnit.test("WriteEvent", PlayFabApiTests.WriteEvent);
            QUnit.test("ForgetCredentials", PlayFabApiTests.ForgetCredentials);
        }
    },

    PostEntityTokenTests: function (count): void {
        if (count > PlayFabApiTests.testRetryCount)
            return;

        if (!PlayFab["_internalSettings"].entityToken) {
            // Wait for login
            setTimeout(function (): void { PlayFabApiTests.PostEntityTokenTests(count + 1); }, PlayFabApiTests.testRetryDelay);
        } else {
            // Continue with other tests that require login
            // QUnit.test("EntityObjects", PlayFabApiTests.EntityObjects); // TODO: Release Entity API
        }
    },

    SetUp: function (inputTitleData): boolean {
        // All of these must exist for the titleData load to be successful
        var titleDataValid = inputTitleData.hasOwnProperty("titleId") && inputTitleData.titleId != null
            && inputTitleData.hasOwnProperty("developerSecretKey") && inputTitleData.developerSecretKey != null
            && inputTitleData.hasOwnProperty("userEmail");

        if (titleDataValid)
            PlayFabApiTests.titleData = inputTitleData;
        else
            console.log("testTitleData input file did not parse correctly");

        PlayFab.settings.titleId = PlayFabApiTests.titleData.titleId;
        PlayFab.settings.developerSecretKey = PlayFabApiTests.titleData.developerSecretKey;
        PlayFab.settings.GlobalHeaderInjection = PlayFabApiTests.titleData.extraHeaders;

        return titleDataValid;
    },

    CallbackWrapper: function <TResult extends PlayFabModule.IPlayFabResultCommon>(callbackName: string, callback: PlayFabModule.ApiCallback<TResult>, assert): PlayFabModule.ApiCallback<TResult> {
        return function (result: PlayFabModule.SuccessContainer<TResult>, error: PlayFabModule.IPlayFabError): void {
            try {
                callback(result, error);
            } catch (e) {
                console.log("Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack); // Very irritatingly, qunit doesn't report failure results until all async callbacks return, which doesn't always happen when there's an exception
                assert.ok(false, "Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack);
            }
        };
    },

    SimpleCallbackWrapper: function (callbackName: string, callback: IAction, assert, kwargs: any = null): IAction {
        return function (): void {
            try {
                callback(kwargs);
            } catch (e) {
                console.log("Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack); // Very irritatingly, qunit doesn't report failure results until all async callbacks return, which doesn't always happen when there's an exception
                assert.ok(false, "Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack);
            }
        };
    },

    VerifyNullError: function <TResult extends PlayFabModule.IPlayFabResultCommon>(result: PlayFabModule.SuccessContainer<TResult>, error: PlayFabModule.IPlayFabError, assert, message: string): void {
        var success = (result !== null && error == null);
        if (error != null) {
            assert.ok(false, "PlayFab error message: " + PlayFab.GenerateErrorReport(error));
        } else {
            assert.ok(success, message);
        }
    },

    /* CLIENT API
     * Try to deliberately log in with an inappropriate password,
     *   and verify that the error displays as expected.
     */
    InvalidLogin: function (assert): void {
        var invalidDone = assert.async();

        var invalidRequest = <PlayFabClientModels.LoginWithEmailAddressRequest>{
            Email: PlayFabApiTests.titleData.userEmail,
            Password: "INVALID"
        };

        var invalidLoginCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.LoginResult>, error: PlayFabModule.IPlayFabError): void {
            assert.ok(result == null, "Login should have failed");
            assert.ok(error != null, "Login should have failed");
            if (error != null)
                assert.ok(error.errorMessage.toLowerCase().indexOf("password") > -1, "Expect errorMessage about invalid password: " + error.errorMessage);
            invalidDone();
        };

        PlayFabClientSDK.LoginWithEmailAddress(invalidRequest, PlayFabApiTests.CallbackWrapper("invalidLoginCallback", invalidLoginCallback, assert));
    },

    /* CLIENT API
     * Try to deliberately register a user with an invalid email and password
     *   Verify that errorDetails are populated correctly.
     */
    InvalidRegistration: function (assert): void {
        var invalidDone = assert.async();

        var invalidRequest = <PlayFabClientModels.RegisterPlayFabUserRequest>{
            Username: "x",
            Email: "x",
            Password: "x"
        };

        var registerCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.RegisterPlayFabUserResult>, error: PlayFabModule.IPlayFabError): void {
            assert.ok(result == null, "InvalidRegistration should have failed");
            assert.ok(error != null, "InvalidRegistration should have failed");
            var expectedEmailMsg = "email address is not valid.";
            var expectedPasswordMsg = "password must be between";
            var errorReport = PlayFab.GenerateErrorReport(error);
            assert.ok(errorReport.toLowerCase().indexOf(expectedEmailMsg) > -1, "Expect errorMessage about invalid email: " + errorReport);
            assert.ok(errorReport.toLowerCase().indexOf(expectedPasswordMsg) > -1, "Expect errorMessage about invalid password: " + errorReport);
            invalidDone();
        };

        PlayFabClientSDK.RegisterPlayFabUser(invalidRequest, PlayFabApiTests.CallbackWrapper("registerCallback", registerCallback, assert));
    },

    /* CLIENT API
     * Log in or create a user, track their PlayFabId
     */
    LoginOrRegister: function (assert): void {
        var loginRequest = <PlayFabClientModels.LoginWithCustomIDRequest>{
            CustomId: PlayFab.buildIdentifier,
            CreateAccount: true
        };

        var loginDone = assert.async();
        var loginCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.LoginResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing Valid login result");
            assert.ok(PlayFabClientSDK.IsClientLoggedIn(), "Testing Login credentials cache");
            if (result != null)
                PlayFabApiTests.testData.playFabId = result.data.PlayFabId; // Save the PlayFabId, it will be used in other tests
            loginDone();
        };

        var loginPromise = Promise.resolve(PlayFabClientSDK.LoginWithCustomID(loginRequest, PlayFabApiTests.CallbackWrapper("loginCallback", loginCallback, assert)))
        // By definition, a promise object should have a .then function, and Promise.resolve(promise) should equal promise
        assert.ok(typeof loginPromise.then === "function" && Promise.resolve(loginPromise) === loginPromise, "Testing whether the login request returned a promise object");
    },

    /* CLIENT API
     * Test a sequence of calls that modifies saved data,
     *   and verifies that the next sequential API call contains updated data.
     * Verify that the data is correctly modified on the next call.
     * Parameter types tested: string, Dictionary<string, string>, DateTime
     */
    UserDataApi: function (assert): void {
        var getDataRequest = <PlayFabClientModels.GetUserDataRequest>{}; // null also works

        // This test is always exactly 3 async calls
        var get1Done = assert.async();
        var updateDone = assert.async();
        var get2Done = assert.async();

        var getDataCallback2 = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetUserDataResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetUserData result");
            assert.ok(result.data.Data != null, "Testing GetUserData Data");
            assert.ok(result.data.Data.hasOwnProperty(PlayFabApiTests.testConstants.TEST_DATA_KEY), "Testing GetUserData DataKey");

            var actualtestNumber = parseInt(result.data.Data[PlayFabApiTests.testConstants.TEST_DATA_KEY].Value, 10);
            var timeUpdated: number = new Date(result.data.Data[PlayFabApiTests.testConstants.TEST_DATA_KEY].LastUpdated).getTime();

            var now: number = Date.now();
            var testMin: number = now - (1000 * 60 * 5);
            var testMax: number = now + (1000 * 60 * 5);
            assert.equal(PlayFabApiTests.testData.testNumber, actualtestNumber, "Testing incrementing counter: " + PlayFabApiTests.testData.testNumber + "==" + actualtestNumber);
            assert.ok(testMin <= timeUpdated && timeUpdated <= testMax, "Testing incrementing timestamp: " + timeUpdated + " vs " + now);
            get2Done();
        };
        var updateDataCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.UpdateUserDataResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing UpdateUserData result");

            PlayFabClientSDK.GetUserData(getDataRequest, PlayFabApiTests.CallbackWrapper("getDataCallback2", getDataCallback2, assert));
            updateDone();
        };
        var getDataCallback1 = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetUserDataResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetUserData result");
            assert.ok(result.data.Data != null, "Testing GetUserData Data");

            var hasData = result.data.Data.hasOwnProperty(PlayFabApiTests.testConstants.TEST_DATA_KEY);
            PlayFabApiTests.testData.testNumber = !hasData ? 1 : parseInt(result.data.Data[PlayFabApiTests.testConstants.TEST_DATA_KEY].Value, 10);
            PlayFabApiTests.testData.testNumber = (PlayFabApiTests.testData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateDataRequest = <PlayFabClientModels.UpdateUserDataRequest>{};
            updateDataRequest.Data = {};
            updateDataRequest.Data[PlayFabApiTests.testConstants.TEST_DATA_KEY] = PlayFabApiTests.testData.testNumber;
            PlayFabClientSDK.UpdateUserData(updateDataRequest, PlayFabApiTests.CallbackWrapper("updateDataCallback", updateDataCallback, assert));
            get1Done();
        };

        // Kick off this test process
        PlayFabClientSDK.GetUserData(getDataRequest, PlayFabApiTests.CallbackWrapper("getDataCallback1", getDataCallback1, assert));
    },

    /* CLIENT API
     * Test a sequence of calls that modifies saved data,
     *   and verifies that the next sequential API call contains updated data.
     * Verify that the data is saved correctly, and that specific types are tested
     * Parameter types tested: Dictionary<string, int> 
     */
    PlayerStatisticsApi: function (assert): void {
        var getStatsRequest = <PlayFabClientModels.GetPlayerStatisticsRequest>{}; // null also works

        // This test is always exactly 3 async calls
        var get1Done = assert.async();
        var updateDone = assert.async();
        var get2Done = assert.async();

        var getStatsCallback2 = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetPlayerStatisticsResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetPlayerStats result");
            assert.ok(result.data.Statistics != null, "Testing GetUserData Stats");

            var actualtestNumber = -1000;
            for (var i = 0; i < result.data.Statistics.length; i++)
                if (result.data.Statistics[i].StatisticName === PlayFabApiTests.testConstants.TEST_STAT_NAME)
                    actualtestNumber = result.data.Statistics[i].Value;

            assert.equal(PlayFabApiTests.testData.testNumber, actualtestNumber, "Testing incrementing stat: " + PlayFabApiTests.testData.testNumber + "==" + actualtestNumber);
            get2Done();
        };
        var updateStatsCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.UpdatePlayerStatisticsResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing UpdatePlayerStats result");
            PlayFabClientSDK.GetPlayerStatistics(getStatsRequest, PlayFabApiTests.CallbackWrapper("getStatsCallback2", getStatsCallback2, assert));
            updateDone();
        };
        var getStatsCallback1 = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetPlayerStatisticsResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetPlayerStats result");
            assert.ok(result.data.Statistics != null, "Testing GetUserData Stats");

            PlayFabApiTests.testData.testNumber = 0;
            for (var i = 0; i < result.data.Statistics.length; i++)
                if (result.data.Statistics[i].StatisticName === PlayFabApiTests.testConstants.TEST_STAT_NAME)
                    PlayFabApiTests.testData.testNumber = result.data.Statistics[i].Value;
            PlayFabApiTests.testData.testNumber = (PlayFabApiTests.testData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateStatsRequest = <PlayFabClientModels.UpdatePlayerStatisticsRequest>{
                Statistics: [{ StatisticName: PlayFabApiTests.testConstants.TEST_STAT_NAME, Value: PlayFabApiTests.testData.testNumber }]
            };
            PlayFabClientSDK.UpdatePlayerStatistics(updateStatsRequest, PlayFabApiTests.CallbackWrapper("updateStatsCallback", updateStatsCallback, assert));
            get1Done();
        };

        // Kick off this test process
        PlayFabClientSDK.GetPlayerStatistics(getStatsRequest, PlayFabApiTests.CallbackWrapper("getStatsCallback1", getStatsCallback1, assert));
    },

    /* CLIENT API
     * Get or create the given test character for the given user
     * Parameter types tested: Contained-Classes, string
     */
    UserCharacter: function (assert): void {
        var getCharsRequest = <PlayFabClientModels.ListUsersCharactersRequest>{};
        var getDone = assert.async();

        var getCharsCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.ListUsersCharactersResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetChars result");
            getDone();
        };
        PlayFabClientSDK.GetAllUsersCharacters(getCharsRequest, PlayFabApiTests.CallbackWrapper("getCharsCallback", getCharsCallback, assert));
    },

    /* CLIENT AND SERVER API
     * Test that leaderboard results can be requested
     * Parameter types tested: List of contained-classes
     */
    LeaderBoard: function (assert): void {
        var clientRequest = <PlayFabClientModels.GetLeaderboardRequest>{
            MaxResultsCount: 3,
            StartPosition: 0,
            StatisticName: PlayFabApiTests.testConstants.TEST_STAT_NAME
        };
        var serverRequest = <PlayFabServerModels.GetLeaderboardRequest>{
            MaxResultsCount: 3,
            StartPosition: 0,
            StatisticName: PlayFabApiTests.testConstants.TEST_STAT_NAME
        };
        var lbDoneC = assert.async();
        var lbDoneS = assert.async();

        var getLeaderboardCallbackC = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetLeaderboardResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetLeaderboard result");
            if (result != null) {
                assert.ok(result.data.Leaderboard != null, "Testing GetLeaderboard content");
                assert.ok(result.data.Leaderboard.length > 0, "Testing GetLeaderboard content-length");
            }

            lbDoneC();
        };
        var getLeaderboardCallbackS = function (result: PlayFabModule.SuccessContainer<PlayFabServerModels.GetLeaderboardResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetLeaderboard result");
            if (result != null) {
                assert.ok(result.data.Leaderboard != null, "Testing GetLeaderboard content");
                assert.ok(result.data.Leaderboard.length > 0, "Testing GetLeaderboard content-length");
            }

            lbDoneS();
        };

        PlayFabClientSDK.GetLeaderboard(clientRequest, PlayFabApiTests.CallbackWrapper("getLeaderboardCallbackC", getLeaderboardCallbackC, assert));
        PlayFabServerSDK.GetLeaderboard(serverRequest, PlayFabApiTests.CallbackWrapper("getLeaderboardCallbackS", getLeaderboardCallbackS, assert));
    },

    /* CLIENT API
     * Test that AccountInfo can be requested
     * Parameter types tested: List of enum-as-strings converted to list of enums
     */
    AccountInfo: function (assert): void {
        var getDone = assert.async();

        var getAccountInfoCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.GetAccountInfoResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetAccountInfo result");
            assert.ok(result.data.AccountInfo != null, "Testing GetAccountInfo");
            assert.ok(result.data.AccountInfo.TitleInfo != null, "Testing TitleInfo");
            assert.ok(result.data.AccountInfo.TitleInfo.Origination != null, "Testing Origination");
            assert.ok(result.data.AccountInfo.TitleInfo.Origination.length > 0, "Testing Origination string-Enum");
            getDone();
        };

        PlayFabClientSDK.GetAccountInfo(<PlayFabClientModels.GetAccountInfoRequest>{}, PlayFabApiTests.CallbackWrapper("getAccountInfoCallback", getAccountInfoCallback, assert));
    },

    /* CLIENT API
     * Test that CloudScript can be properly set up and invoked
     */
    CloudScript: function (assert): void {
        var hwDone = assert.async();

        var helloWorldRequest = <PlayFabClientModels.ExecuteCloudScriptRequest>{
            FunctionName: "helloWorld"
        };

        var helloWorldCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.ExecuteCloudScriptResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing HelloWorld result");
            if (result != null) {
                assert.ok(result.data.FunctionResult != null, "Testing HelloWorld result");
                assert.ok(result.data.FunctionResult.messageValue != null, "Testing HelloWorld result message");
                assert.equal(result.data.FunctionResult.messageValue, "Hello " + PlayFabApiTests.testData.playFabId + "!", "HelloWorld cloudscript result: " + result.data.FunctionResult.messageValue);
            }
            hwDone();
        };

        PlayFabClientSDK.ExecuteCloudScript(helloWorldRequest, PlayFabApiTests.CallbackWrapper("helloWorldCallback", helloWorldCallback, assert));
    },

    /* CLIENT API
     * Test that CloudScript errors can be deciphered
     */
    CloudScriptError: function (assert): void {
        var errDone = assert.async();

        var errRequest = <PlayFabClientModels.ExecuteCloudScriptRequest>{
            FunctionName: "throwError"
        };

        var errCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.ExecuteCloudScriptResult>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing Cloud Script Error result");
            if (result != null) {
                assert.ok(result.data.FunctionResult == null, "Testing Cloud Script Error result");
                assert.ok(result.data.Error != null, "Testing Cloud Script Error result message");
                assert.equal(result.data.Error.Error, "JavascriptException", "Testing Cloud Script Error result message");
            }
            errDone();
        };

        PlayFabClientSDK.ExecuteCloudScript(errRequest, PlayFabApiTests.CallbackWrapper("errCallback", errCallback, assert));
    },

    /* CLIENT API
     * Test that the client can publish custom PlayStream events
     */
    WriteEvent: function (assert): void {
        var writeEventDone = assert.async();

        var writeEventRequest = <PlayFabClientModels.WriteClientPlayerEventRequest>{
            EventName: "ForumPostEvent"
        };
        writeEventRequest.Body = {};
        writeEventRequest.Body["Subject"] = "My First Post";
        writeEventRequest.Body["Body"] = "This is my awesome post.";

        var writeEventCallback = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.WriteEventResponse>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing WriteEvent result");
            writeEventDone();
        };

        PlayFabClientSDK.WritePlayerEvent(writeEventRequest, PlayFabApiTests.CallbackWrapper("writeEventCallback", writeEventCallback, assert));
    },

    ///* ENTITY API
    // * Test a sequence of calls that modifies saved data,
    // *   and verifies that the next sequential API call contains updated data.
    // * Verify that the data is correctly modified on the next call.
    // * Parameter types tested: string, Dictionary<string, string>, DateTime
    // */
    GetEntityToken: function (assert): void {
        var getTokenDone = assert.async();
        var getTokenCallback = function (result: PlayFabModule.SuccessContainer<PlayFabDataModels.GetObjectsResponse>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetToken result");
            PlayFabApiTests.testData.entityId = result.data.Entity.Id;
            PlayFabApiTests.testData.entityType = result.data.Entity.Type;
            getTokenDone();
        };

        var getTokenRequest = <PlayFabAuthenticationModels.GetEntityTokenRequest>{};
        PlayFabAuthenticationSDK.GetEntityToken(getTokenRequest, PlayFabApiTests.CallbackWrapper("getTokenCallback", getTokenCallback, assert));
    },

    ///* ENTITY API
    // * Test a sequence of calls that modifies saved data,
    // *   and verifies that the next sequential API call contains updated data.
    // * Verify that the data is correctly modified on the next call.
    // * Parameter types tested: string, Dictionary<string, string>, DateTime
    // */
    EntityObjects: function (assert): void {
        var getObjectRequest = <PlayFabDataModels.GetObjectsRequest>{
            Entity: {
                Id: PlayFabApiTests.testData.entityId,
                Type: PlayFabApiTests.testData.entityType,
            },
            EscapeObject: true,
        };

        // This test is always exactly 3 async calls
        var get1Done = assert.async();
        var updateDone = assert.async();
        var get2Done = assert.async();

        var getObjectCallback2 = function (result: PlayFabModule.SuccessContainer<PlayFabDataModels.GetObjectsResponse>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetObjects result");
            assert.ok(result.data.Objects != null, "Testing GetObjects Objects");
            var actualtestNumber = JSON.parse(result.data.Objects[PlayFabApiTests.testConstants.TEST_DATA_KEY].EscapedDataObject);
            assert.ok(actualtestNumber != null && typeof actualtestNumber === "number", "Testing GetObjects contains target obj (as number)");

            assert.equal(PlayFabApiTests.testData.testNumber, actualtestNumber, "Testing incrementing counter: " + PlayFabApiTests.testData.testNumber + "==" + actualtestNumber);
            get2Done();
        };
        var setObjectCallback = function (result: PlayFabModule.SuccessContainer<PlayFabDataModels.SetObjectsResponse>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing SetObjects result");

            PlayFabDataSDK.GetObjects(getObjectRequest, PlayFabApiTests.CallbackWrapper("getObjectCallback2", getObjectCallback2, assert));
            updateDone();
        };
        var getObjectCallback1 = function (result: PlayFabModule.SuccessContainer<PlayFabDataModels.GetObjectsResponse>, error: PlayFabModule.IPlayFabError): void {
            PlayFabApiTests.VerifyNullError(result, error, assert, "Testing GetObjects result");
            assert.ok(result.data.Objects != null, "Testing GetObjects Objects");
            PlayFabApiTests.testData.testNumber = 0;
            if (result.data.Objects.hasOwnProperty(PlayFabApiTests.testConstants.TEST_DATA_KEY))
                PlayFabApiTests.testData.testNumber = JSON.parse(result.data.Objects[PlayFabApiTests.testConstants.TEST_DATA_KEY].EscapedDataObject);
            PlayFabApiTests.testData.testNumber = (PlayFabApiTests.testData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds

            var updateDataRequest = <PlayFabDataModels.SetObjectsRequest>{
                Entity: {
                    Id: PlayFabApiTests.testData.entityId,
                    Type: PlayFabApiTests.testData.entityType,
                },
                Objects: [{ ObjectName: PlayFabApiTests.testConstants.TEST_DATA_KEY, DataObject: PlayFabApiTests.testData.testNumber }]
            };
            PlayFabDataSDK.SetObjects(updateDataRequest, PlayFabApiTests.CallbackWrapper("setObjectCallback", setObjectCallback, assert));
            get1Done();
        };

        // Kick off this test process
        PlayFabDataSDK.GetObjects(getObjectRequest, PlayFabApiTests.CallbackWrapper("getObjectCallback1", getObjectCallback1, assert));
    },

    /* CLIENT API
     * Test that the client can log out
     */
    ForgetCredentials: function (assert): void {
        assert.ok(PlayFabClientSDK.IsClientLoggedIn(), "Client should be logged in.");
        PlayFabClientSDK.ForgetAllCredentials();
        assert.ok(!PlayFabClientSDK.IsClientLoggedIn(), "Client should NOT be logged in.");
    },
};

// The test report that will ultimately be relayed back to Cloud Script when the suite finishes
var PfTestReport = [{
    name: null,
    tests: 0,
    failures: 0,
    errors: 0,
    skipped: 0,
    time: 0.0,
    timestamp: "",
    testResults: []
}];

QUnit.begin(function (details): void {
    PfTestReport[0].name = PlayFab.buildIdentifier;
    PfTestReport[0].timestamp = (new Date()).toISOString();
});

QUnit.testDone(function (details): void {
    PfTestReport[0].tests += 1;
    var isFail = details.failed > 0 || details.passed !== details.total;
    if (isFail) {
        PfTestReport[0].failures += 1;
        PfTestReport[0].testResults.push({
            classname: PlayFab.buildIdentifier,
            name: details.name,
            time: details.runtime / 1000.0,
            message: "Test failure message", // TODO: Can we get the real test message here?
            failureText: "FAILED"
        });
    } else {
        PfTestReport[0].testResults.push({
            classname: PlayFab.buildIdentifier,
            name: details.name,
            time: details.runtime / 1000.0
        });
    }
});

// Register for all the QUnit hooks so we can track all the tests that are complete
QUnit.done(function (details): void {
    PfTestReport[0].time = details.runtime / 1000.0;

    var saveResultsRequest = <PlayFabClientModels.ExecuteCloudScriptRequest>{
        FunctionName: "SaveTestData",
        FunctionParameter: { customId: PlayFab.buildIdentifier, testReport: PfTestReport },
        GeneratePlayStreamEvent: true
    };
    var onSaveResultsFinal = function (result: PlayFabModule.SuccessContainer<PlayFabClientModels.ExecuteCloudScriptResult>, error: PlayFabModule.IPlayFabError): void {
        if (result && !error) {
            console.log(PlayFabApiTests.testData.playFabId, ", Test report saved to CloudScript: ", PlayFab.buildIdentifier, "\n", JSON.stringify(PfTestReport, null, 4));
        } else {
            console.log(PlayFabApiTests.testData.playFabId, ", Failed to save test report to CloudScript (CS Error): ", PlayFab.buildIdentifier, "\n", JSON.stringify(PfTestReport, null, 4));
        }
    };
    if (PlayFabClientSDK.IsClientLoggedIn()) {
        PlayFabClientSDK.ExecuteCloudScript(saveResultsRequest, onSaveResultsFinal);
    } else {
        console.log(PlayFabApiTests.testData.playFabId, ", Failed to save test report to CloudScript (Login): ", PlayFab.buildIdentifier, "\n", JSON.stringify(PfTestReport, null, 4));
    }
});

PlayFabApiTests.ManualExecution();
