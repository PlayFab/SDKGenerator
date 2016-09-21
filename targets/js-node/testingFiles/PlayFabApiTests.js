var PlayFab = require("./PlayFab.js");
var PlayFabAdmin = require("./PlayFabAdmin.js"); // Not strictly needed for this test, but I want to make sure it compiles/loads
var PlayFabMatchmaker = require("./PlayFabMatchmaker.js"); // Not strictly needed for this test, but I want to make sure it compiles/loads
var PlayFabClient = require("./PlayFabClient.js");
var PlayFabServer = require("./PlayFabServer.js");
var fs = require("fs");

// These tests require that you have installed nodeunit
try {
    var nodeunit = require("nodeunit");
    var reporter = nodeunit.reporters.PlayFabMinimal;
    reporter.PfTestReport[0].name = PlayFab.buildIdentifier;
}
catch (e) {
    console.log(JSON.stringify(nodeunit.reporters));
    console.log("Could not load nodeunit module: " + e.message);
    console.log("Install via Command line: npm install nodeunit -g");
    process.exit();
}

var TitleData = {
    // You can set default values for testing here
    // Or you can provide the same structure in a json-file and load with LoadTitleData
    titleId: "",
    developerSecretKey: "",
    titleCanUpdateSettings: "",
    userEmail: "",
    characterName: ""
};

var TestConstants = {
    TEST_KEY: "testCounter",
    TEST_STAT_NAME: "str",
    CHAR_TEST_TYPE: "Fighter"
};

var TestData = {
    playFabId: null,
    characterId: null,
    testNumber: null
};

function TestWrapper(testFunc) {
    // The purpose of this TestWrapper is to report tests as failures when they throw exceptions.
    // It's pretty disappointing that this isn't part of the testing library
    return function (test) {
        try {
            testFunc(test);
        } catch (e) {
            test.ok(false, "Exception thrown during test: " + e.toString() + "\n" + e.stack);
            test.done(); // This is required to display the error above, and abort the test
        }
    }
}

function CallbackWrapper(callbackName, callback, test) {
    // Wrap PlayFab result callbacks so that exceptions in callbacks report into the test as failures
    // This is is specific to catching exceptions in the PlayFab callbacks, since they're async,
    //   they don't share the same stacktrace as the function that calls them
    return function (error, result) {
        try {
            callback(error, result);
        } catch (e) {
            test.ok(false, "Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack);
            test.done(); // This is required to display the error above, and abort the test
        }
    };
}

function SimpleCallbackWrapper(callbackName, callback, test) {
    // Wrap no-parameter callbacks so that exceptions in callbacks report into the test as failures
    // This is is specific to catching exceptions in the PlayFab callbacks, since they're async,
    //   they don't share the same stacktrace as the function that calls them
    return function () {
        try {
            callback();
        } catch (e) {
            test.ok(false, "Exception thrown during " + callbackName + " callback: " + e.toString() + "\n" + e.stack);
            test.done(); // This is required to display the error above, and abort the test
        }
    };
}

function VerifyNullError(result, error, test, message) {
    var success = (result !== null && error == null);
    if (error != null) {
        test.ok(false, "PlayFab error message: " + CompileErrorReport(error));
    } else {
        test.ok(success, message);
    }
}

function CompileErrorReport(error) {
    if (error == null)
        return "";
    var fullErrors = error.errorMessage;
    for (var paramName in error.errorDetails)
        for (var msgIdx in error.errorDetails[paramName])
            fullErrors += "\n" + paramName + ": " + error.errorDetails[paramName][msgIdx];
    return fullErrors;
}

exports.PlayFabApiTests = {
    setUp: function (callback) {
        var filename = "C:/depot/pf-main/tools/SDKBuildScripts/testTitleData.json"; // TODO: Do not hard code the location of this file
        var prefix = "testTitleData=";
        for (var arg in process.argv)
            if (arg.toLowerCase().indexOf(prefix) === 0)
                filename = arg.substr(prefix.length, arg.length - prefix.length);
        if (filename != null && fs.existsSync(filename)) {
            var inputTitleData = require(filename);
            
            // All of these must exist for the TitleData load to be successful
            var titleDataValid = inputTitleData.hasOwnProperty("titleId") 
            && inputTitleData.hasOwnProperty("developerSecretKey") 
            && inputTitleData.hasOwnProperty("titleCanUpdateSettings") 
            && inputTitleData.hasOwnProperty("userEmail") 
            && inputTitleData.hasOwnProperty("characterName");
            
            if (titleDataValid)
                TitleData = inputTitleData;
            else
                console.log("testTitleData input file did not parse correctly");
        }
        PlayFab.settings.titleId = TitleData.titleId;
        PlayFab.settings.developerSecretKey = TitleData.developerSecretKey;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    
    /// <summary>
    /// CLIENT API
    /// Try to deliberately log in with an inappropriate password,
    ///   and verify that the error displays as expected.
    /// </summary>
    InvalidLogin: TestWrapper(function (test) {
        var invalidRequest = {
            TitleId: PlayFab.settings.titleId,
            Email: TitleData.userEmail,
            Password: "INVALID"
        };
        
        var invalidLoginCallback = function (error, result) {
            test.ok(result == null, "Login should have failed");
            test.ok(error != null, "Login should have failed");
            if (error != null)
                test.ok(error.errorMessage.toLowerCase().indexOf("password") > -1, error.errorMessage);
            test.done();
        };
        PlayFabClient.LoginWithEmailAddress(invalidRequest, CallbackWrapper("invalidLoginCallback", invalidLoginCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Try to deliberately register a user with an invalid email and password
    ///   Verify that errorDetails are populated correctly.
    /// </summary>
    InvalidRegistration: TestWrapper(function (test) {
        var invalidRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/RegisterPlayFabUser
            TitleId: PlayFab.settings.titleId,
            Username: "x",
            Email: "x",
            Password: "x"
        };
        
        var registerCallback = function (error, result) {
            test.ok(result == null, "InvalidRegistration should have failed");
            test.ok(error != null, "InvalidRegistration should have failed");
            var expectedEmailMsg = "email address is not valid.";
            var expectedPasswordMsg = "password must be between";
            var errorReport = CompileErrorReport(error);
            test.ok(errorReport.toLowerCase().indexOf(expectedEmailMsg) > -1, "Expect errorMessage about invalid email: " + errorReport);
            test.ok(errorReport.toLowerCase().indexOf(expectedPasswordMsg) > -1, "Expect errorMessage about invalid password: " + errorReport);
            test.done();
        };
        
        PlayFabClient.RegisterPlayFabUser(invalidRequest, CallbackWrapper("registerCallback", registerCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Log in or create a user, track their PlayFabId
    /// </summary>
    LoginOrRegister: TestWrapper(function (test) {
        var loginRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/LoginWithCustomID
            TitleId: PlayFab.settings.titleId,
            CustomId: PlayFab.buildIdentifier,
            CreateAccount: true
        };
        
        var loginCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing Valid login result");
            test.ok(PlayFab._internalSettings.sessionTicket != null, "Testing Login credentials cache");
            TestData.playFabId = result.data.PlayFabId; // Save the PlayFabId, it will be used in other tests
            test.done();
        };
        PlayFabClient.LoginWithCustomID(loginRequest, CallbackWrapper("loginCallback", loginCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test that the login call sequence sends the AdvertisingId when set
    /// </summary>
    LoginWithAdvertisingId: TestWrapper(function (test) {
        PlayFab.settings.advertisingIdType = PlayFab.settings.AD_TYPE_ANDROID_ID;
        PlayFab.settings.advertisingIdValue = "PlayFabTestId";
        
        var count = -1;
        var finishAdvertId = function () {
            count += 1;
            if (count > 10) {
                test.ok(false, "The advertisingId was not submitted properly");
                test.done();
            } else if (PlayFab.settings.advertisingIdType === PlayFab.settings.AD_TYPE_ANDROID_ID + "_Successful")
                test.done();
            else
                setTimeout(SimpleCallbackWrapper("finishAdvertId", finishAdvertId, test), 200);
        };
        var advertLoginCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing Advert-Login result");
            setTimeout(SimpleCallbackWrapper("finishAdvertId", finishAdvertId, test), 200);
        };
        var loginRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/LoginWithCustomID
            TitleId: PlayFab.settings.titleId,
            CustomId: PlayFab.buildIdentifier,
            CreateAccount: true
        };
        PlayFabClient.LoginWithCustomID(loginRequest, CallbackWrapper("advertLoginCallback", advertLoginCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is correctly modified on the next call.
    /// Parameter types tested: string, Dictionary<string, string>, DateTime
    /// </summary>
    UserDataApi: TestWrapper(function (test) {
        var getDataRequest = {}; // null also works
        
        var getDataCallback2 = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetUserData result");
            test.ok(result.data.Data != null, "GetUserData failed");
            test.ok(result.data.Data.hasOwnProperty(TestConstants.TEST_KEY), "GetUserData failed");
            
            var actualtestNumber = parseInt(result.data.Data[TestConstants.TEST_KEY].Value, 10);
            var actualTimeStamp = new Date(result.data.Data[TestConstants.TEST_KEY].LastUpdated);
            
            test.equal(TestData.testNumber, actualtestNumber, "" + TestData.testNumber + "!=" + actualtestNumber);
            
            var now = Date.now();
            var testMin = now - (1000 * 60 * 5);
            var testMax = now + (1000 * 60 * 5);
            test.ok(testMin <= actualTimeStamp && actualTimeStamp <= testMax);
            test.done();
        };
        var updateDataCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing UpdateUserData result");
            
            PlayFabClient.GetUserData(getDataRequest, CallbackWrapper("getDataCallback2", getDataCallback2, test));
        };
        var getDataCallback1 = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetUserData result");
            test.ok(result.data.Data != null, "GetUserData failed");
            
            var hasData = result.data.Data.hasOwnProperty(TestConstants.TEST_KEY);
            TestData.testNumber = !hasData ? 1 : parseInt(result.data.Data[TestConstants.TEST_KEY].Value, 10);
            TestData.testNumber = (TestData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds
            
            var updateDataRequest = {
                // Currently, you need to look up the correct format for this object in the API-docs:
                //   https://api.playfab.com/Documentation/Client/method/UpdateUserData
                Data: {} // Can't pre-define properties because the param-name is in a string
            };
            updateDataRequest.Data[TestConstants.TEST_KEY] = TestData.testNumber;
            PlayFabClient.UpdateUserData(updateDataRequest, CallbackWrapper("updateDataCallback", updateDataCallback, test));
        };
        
        // Kick off this test process
        PlayFabClient.GetUserData(getDataRequest, CallbackWrapper("updateDataCallback", getDataCallback1, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test a sequence of calls that modifies saved data,
    ///   and verifies that the next sequential API call contains updated data.
    /// Verify that the data is saved correctly, and that specific types are tested
    /// Parameter types tested: Dictionary<string, int> 
    /// </summary>
    PlayerStatisticsApi: TestWrapper(function (test) {
        var getStatsRequest = {}; // null also works
        
        var getStatsCallback2 = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetPlayerStats result");
            test.ok(result.data.Statistics != null, "GetPlayerStats failed");
            
            var actualtestNumber = -1000;
            for (var i = 0; i < result.data.Statistics.length; i++)
                if (result.data.Statistics[i].StatisticName === TestConstants.TEST_STAT_NAME)
                    actualtestNumber = result.data.Statistics[i].Value;
            
            test.equal(TestData.testNumber, actualtestNumber, "" + TestData.testNumber + "!=" + actualtestNumber);
            test.done();
        };
        var updateStatsCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing UpdatePlayerStats result");
            PlayFabClient.GetPlayerStatistics(getStatsRequest, CallbackWrapper("getStatsCallback2", getStatsCallback2, test));
        };
        var getStatsCallback1 = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetPlayerStats result");
            test.ok(result.data.Statistics != null, "GetPlayerStats failed");
            
            TestData.testNumber = 0;
            for (var i = 0; i < result.data.Statistics.length; i++)
                if (result.data.Statistics[i].StatisticName === TestConstants.TEST_STAT_NAME)
                    TestData.testNumber = result.data.Statistics[i].Value;
            TestData.testNumber = (TestData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds
            
            var updateStatsRequest = {
                // Currently, you need to look up the correct format for this object in the API-docs:
                //   https://api.playfab.com/Documentation/Client/method/UpdatePlayerStatistics
                Statistics: [{ StatisticName: TestConstants.TEST_STAT_NAME, Value: TestData.testNumber }]
            };
            PlayFabClient.UpdatePlayerStatistics(updateStatsRequest, CallbackWrapper("updateStatsCallback", updateStatsCallback, test));
        };
        
        // Kick off this test process
        PlayFabClient.GetPlayerStatistics(getStatsRequest, CallbackWrapper("getStatsCallback1", getStatsCallback1, test));
    }),
    
    /// <summary>
    /// SERVER API
    /// Get or create the given test character for the given user
    /// Parameter types tested: Contained-Classes, string
    /// </summary>
    UserCharacter: TestWrapper(function (test) {
        var getCharsRequest = {};
        var grantCharRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Server/method/GrantCharacterToUser
            TitleId: TitleData.titleId,
            PlayFabId: TestData.playFabId,
            CharacterName: TitleData.characterName,
            CharacterType: TestConstants.CHAR_TEST_TYPE
        };
        
        var mandatoryGetCharsCallback = function (error, result) {
            // GetChars MUST succeed at some point during this test
            VerifyNullError(result, error, test, "Testing GetChars result");
            
            for (var i in result.data.Characters)
                if (result.data.Characters[i].CharacterName === TitleData.characterName)
                    TestData.characterId = result.data.Characters[i].CharacterId; // Save the characterId, it will be used in other tests
            
            test.ok(TestData.characterId != null, "Cannot find " + TitleData.characterName + " on this account.");
            test.done();
        };
        var grantCharCallback = function (error, result) {
            // Second character callback MUST succeed
            VerifyNullError(result, error, test, "Testing GrantCharacter result");
            
            // Get chars again, this time with the newly granted character
            PlayFabClient.GetAllUsersCharacters(getCharsRequest, CallbackWrapper("mandatoryGetCharsCallback", mandatoryGetCharsCallback, test));
        };
        var optionalGetCharsCallback = function (error, result) {
            // First get chars falls back upon grant-char if target character not present
            if (result == null || result.data.Characters.length === 0) {
                // Register the character and try again
                PlayFabServer.GrantCharacterToUser(grantCharRequest, CallbackWrapper("grantCharCallback", grantCharCallback, test));
            }
            else {
                // Confirm the successful login
                mandatoryGetCharsCallback(error, result);
            }
        };
        PlayFabClient.GetAllUsersCharacters(getCharsRequest, CallbackWrapper("optionalGetCharsCallback", optionalGetCharsCallback, test));
    }),
    
    /// <summary>
    /// CLIENT AND SERVER API
    /// Test that leaderboard results can be requested
    /// Parameter types tested: List of contained-classes
    /// </summary>
    LeaderBoard: TestWrapper(function (test) {
        var clientRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/GetLeaderboard
            MaxResultsCount: 3,
            StatisticName: TestConstants.TEST_STAT_NAME
        };
        var serverRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Server/method/GetLeaderboard
            MaxResultsCount: 3,
            StatisticName: TestConstants.TEST_STAT_NAME
        };
        
        var callsCompleted = 0;
        
        var getLeaderboardCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetLeaderboard result");
            if (result != null) {
                test.ok(result.data.Leaderboard != null, "GetLeaderboard failed");
                test.ok(result.data.Leaderboard.length > 0, "Leaderboard had insufficient entries");
            }
            
            callsCompleted += 1;
            
            if (callsCompleted === 2)
                test.done();
        };
        
        PlayFabClient.GetLeaderboard(clientRequest, CallbackWrapper("getLeaderboardCallback", getLeaderboardCallback, test));
        PlayFabServer.GetLeaderboard(serverRequest, CallbackWrapper("getLeaderboardCallback", getLeaderboardCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test that AccountInfo can be requested
    /// Parameter types tested: List of enum-as-strings converted to list of enums
    /// </summary>
    AccountInfo: TestWrapper(function (test) {
        var getAccountInfoCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing GetAccountInfo result");
            test.ok(result.data.AccountInfo != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo.Origination != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo.Origination.length > 0, "GetAccountInfo string-Enum failed");
            test.done();
        };
        
        PlayFabClient.GetAccountInfo({}, CallbackWrapper("getAccountInfoCallback", getAccountInfoCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test that CloudScript can be properly set up and invoked
    /// </summary>
    CloudScript: TestWrapper(function (test) {
        var helloWorldRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/ExecuteCloudScript
            FunctionName: "helloWorld"
        };
        
        var helloWorldCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing HelloWorld result");
            if (result != null) {
                test.ok(result.data.FunctionResult != null, "HelloWorld failed");
                test.ok(result.data.FunctionResult.messageValue != null, "HelloWorld failed");
                test.equal(result.data.FunctionResult.messageValue, "Hello " + TestData.playFabId + "!", "Unexpected HelloWorld cloudscript result: " + result.data.FunctionResult.messageValue);
            }
            test.done();
        };
        
        PlayFabClient.ExecuteCloudScript(helloWorldRequest, CallbackWrapper("helloWorldCallback", helloWorldCallback, test));
    }),
    
    /// <summary>
    /// CLIENT API
    /// Test that the client can publish custom PlayStream events
    /// </summary>
    WriteEvent: function (test) {
        var writeEventRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/WritePlayerEvent
            "EventName": "ForumPostEvent",
            "Body": {
                "Subject": "My First Post",
                "Body": "This is my awesome post."
            }
        };
        
        var writeEventCallback = function (error, result) {
            VerifyNullError(result, error, test, "Testing WriteEvent result");
            test.done();
        };
        
        PlayFabClient.WritePlayerEvent(writeEventRequest, CallbackWrapper("writeEventCallback", writeEventCallback, test));
    },
};

nodeunit.on('complete', function () {
    var saveResultsRequest = {
        // Currently, you need to look up the correct format for this object in the API-docs:
        //   https://api.playfab.com/Documentation/Client/method/ExecuteCloudScript
        FunctionName: "SaveTestData",
        FunctionParameter: { customId: PlayFab.buildIdentifier, testReport: reporter.PfTestReport },
        GeneratePlayStreamEvent: true
    };
    if (PlayFabClient.IsClientLoggedIn()) {
        PlayFabClient.ExecuteCloudScript(saveResultsRequest, null);
        console.log(TestData.playFabId, ", Test report saved to CloudScript: ", PlayFab.buildIdentifier);//, "\n", JSON.stringify(reporter.PfTestReport, null, 4));
    } else {
        console.log(TestData.playFabId, ", Failed to save test report to CloudScript: ", PlayFab.buildIdentifier);//, "\n", JSON.stringify(reporter.PfTestReport, null, 4));
    }
});

reporter.run(["PlayFabApiTests.js"]);
