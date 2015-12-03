var PlayFab = require("./PlayFab.js");
var PlayFabAdmin = require("./PlayFabAdmin.js"); // Not strictly needed for this test, but I want to make sure it compiles/loads
var PlayFabMatchmaker = require("./PlayFabMatchmaker.js"); // Not strictly needed for this test, but I want to make sure it compiles/loads
var PlayFabClient = require("./PlayFabClient.js");
var PlayFabServer = require("./PlayFabServer.js");
var fs = require("fs");

// These tests require that you have installed nodeunit
try {
    var reporter = require("nodeunit").reporters.default;
}
catch (e) {
    console.log("Cannot find nodeunit module.");
    console.log("Install via Command line: npm install nodeunit -g");
    process.exit();
}

var titleData = {
    // You can set default values for testing here
    // Or you can provide the same structure in a json-file and load with LoadTitleData
    titleId: "",
    developerSecretKey: "",
    titleCanUpdateSettings: "",
    userName: "",
    userEmail: "",
    userPassword: "",
    characterName: ""
};

var testConstants = {
    TEST_KEY: "testCounter",
    TEST_STAT_NAME: "str"
};

var testData = {
    playFabId: null,
    characterId: null,
    testNumber: null,
    testTimeStamp: null
};

function TestWrapper(testFunc) {
    // The purpose of this TestWrapper is to report tests as failures when they throw exceptions.
    // It's pretty disappointing that this isn't part of the testing library
    return function (test) {
        try {
            testFunc(test);
        } catch (e) {
            test.ok(false, "Exception thrown during test: " + e.toString());
            test.done(); // This is required to display the error above, and abort the test
        }
    }
}

function CallbackWrapper(callback, test) {
    // Wrap PlayFab result callbacks so that exceptions in callbacks report into the test as failures
    // This is is specific to catching exceptions in the PlayFab callbacks, since they're async,
    //   they don 't share the same stacktrace as the function that calls them
    return function (error, result) {
        try {
            callback(error, result);
        } catch (e) {
            test.ok(false, "Exception thrown during test callback: " + e.toString());
            test.done(); // This is required to display the error above, and abort the test
        }
    };
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
            
            // All of these must exist for the titleData load to be successful
            var titleDataValid = inputTitleData.hasOwnProperty("titleId") 
            && inputTitleData.hasOwnProperty("developerSecretKey") 
            && inputTitleData.hasOwnProperty("titleCanUpdateSettings") 
            && inputTitleData.hasOwnProperty("userName") 
            && inputTitleData.hasOwnProperty("userEmail") 
            && inputTitleData.hasOwnProperty("userPassword") 
            && inputTitleData.hasOwnProperty("characterName");
            
            if (titleDataValid)
                titleData = inputTitleData;
            else
                console.log("testTitleData input file did not parse correctly");
        }
        PlayFab.settings.titleId = titleData.titleId;
        PlayFab.settings.developerSecretKey = titleData.developerSecretKey;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    InvalidLogin: TestWrapper(function (test) {
        var invalidRequest = {
            TitleId: PlayFab.settings.titleId,
            Email: titleData.userEmail,
            Password: titleData.userPassword + "INVALID"
        };
        
        var InvalidLoginCallback = function (error, result) {
            test.ok(result == null, "Login should have failed");
            test.ok(error != null, "Login should have failed");
            test.ok(error.errorMessage.toLowerCase().indexOf("password") > -1, error.errorMessage);
            test.done();
        };
        PlayFabClient.LoginWithEmailAddress(invalidRequest, CallbackWrapper(InvalidLoginCallback, test));
    }),
    LoginOrRegister: TestWrapper(function (test) {
        var loginRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/LoginWithEmailAddress
            TitleId: PlayFab.settings.titleId,
            Email: titleData.userEmail,
            Password: titleData.userPassword
        };
        var registerRequest = {
            // Currently, you need to look up the correct format for this object in the API-docs:
            //   https://api.playfab.com/Documentation/Client/method/RegisterPlayFabUser
            TitleId: PlayFab.settings.titleId,
            Username: titleData.userName,
            Email: titleData.userEmail,
            Password: titleData.userPassword
        };
        
        var OptionalLoginCallback = function (error, result) {
            // First login falls back upon registration if login failed
            if (result == null) {
                // Register the character and try again
                PlayFabClient.RegisterPlayFabUser(registerRequest, CallbackWrapper(RegisterCallback, test));
            }
            else {
                // Confirm the successful login
                MandatoryLoginCallback(error, result);
            }
        };
        var RegisterCallback = function (error, result) {
            // Second login MUST succeed
            test.ok(error == null, "Registration failed");
            test.ok(result != null, "Registration failed");
            
            // Log in again, this time with the newly registered account
            PlayFabClient.LoginWithEmailAddress(loginRequest, CallbackWrapper(MandatoryLoginCallback, test));
        };
        var MandatoryLoginCallback = function (error, result) {
            // Login MUST succeed at some point during this test
            test.ok(error == null, "Valid login failed");
            test.ok(result != null, "Valid login failed");
            test.ok(PlayFab._internalSettings.sessionTicket != null, "Login credentials not saved correctly");
            testData.playFabId = result.data.PlayFabId; // Save the PlayFabId, it will be used in other tests
            test.done();
        };
        PlayFabClient.LoginWithEmailAddress(loginRequest, CallbackWrapper(OptionalLoginCallback, test));
    }),
    UserDataApi: TestWrapper(function (test) {
        var getDataRequest = {}; // null also works
        
        var GetDataCallback1 = function (error, result) {
            test.ok(error == null, "GetUserData failed");
            test.ok(result != null, "GetUserData failed");
            test.ok(result.data.Data != null, "GetUserData failed");
            
            if (result.data.Data.hasOwnProperty(testConstants.TEST_KEY)) {
                testData.testNumber = parseInt(result.data.Data[testConstants.TEST_KEY].Value, 10);
                testData.testTimeStamp = new Date(result.data.Data[testConstants.TEST_KEY].LastUpdated);
            } else {
                testData.testNumber = 1;
                testData.testTimeStamp = new Date.now();
            }
            testData.testNumber = (testData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds
            
            var updateDataRequest = {}; // Can't create this until we have the testNumber value
            updateDataRequest.Data = {};
            updateDataRequest.Data[testConstants.TEST_KEY] = testData.testNumber;
            PlayFabClient.UpdateUserData(updateDataRequest, CallbackWrapper(UpdateDataCallback, test));
        };
        var UpdateDataCallback = function (error, result) {
            test.ok(result != null, "UpdateUserData failed");
            test.ok(error == null, "UpdateUserData failed");
            PlayFabClient.GetUserData(getDataRequest, CallbackWrapper(GetDataCallback2, test));
        };
        var GetDataCallback2 = function (error, result) {
            test.ok(result != null, "GetUserData failed");
            test.ok(error == null, "GetUserData failed");
            test.ok(result.data.Data != null, "GetUserData failed");
            test.ok(result.data.Data.hasOwnProperty(testConstants.TEST_KEY), "GetUserData failed");
            
            var actualtestNumber = parseInt(result.data.Data[testConstants.TEST_KEY].Value, 10);
            var actualTimeStamp = new Date(result.data.Data[testConstants.TEST_KEY].LastUpdated);
            
            test.equal(testData.testNumber, actualtestNumber, "" + testData.testNumber + "!=" + actualtestNumber);
            
            var timeUpdated = testData.testTimeStamp;
            var testMin = Date.now() - (1000 * 60 * 5);
            var testMax = testMin + (1000 * 60 * 10);
            test.ok(testMin <= actualTimeStamp && actualTimeStamp <= testMax);
            test.done();
        };
        
        // Kick off this test process
        PlayFabClient.GetUserData(getDataRequest, CallbackWrapper(GetDataCallback1, test));
    }),
    UserStatisticsApi: TestWrapper(function (test) {
        var getStatsRequest = {}; // null also works
        
        var GetStatsCallback1 = function (error, result) {
            test.ok(error == null, "GetUserStats failed");
            test.ok(result != null, "GetUserStats failed");
            test.ok(result.data.UserStatistics != null, "GetUserStats failed");
            test.ok(result.data.UserStatistics.hasOwnProperty(testConstants.TEST_STAT_NAME), "GetUserStats failed");
            
            testData.testNumber = result.data.UserStatistics[testConstants.TEST_STAT_NAME];
            testData.testNumber = (testData.testNumber + 1) % 100; // This test is about the expected value changing - but not testing more complicated issues like bounds
            
            var updateStatsRequest = {}; // Can't create this until we have the testNumber value
            updateStatsRequest.UserStatistics = {};
            updateStatsRequest.UserStatistics[testConstants.TEST_STAT_NAME] = testData.testNumber;
            PlayFabClient.UpdateUserStatistics(updateStatsRequest, CallbackWrapper(UpdateStatsCallback, test));
        };
        var UpdateStatsCallback = function (error, result) {
            test.ok(error == null, "UpdateUserStats failed");
            test.ok(result != null, "UpdateUserStats failed");
            PlayFabClient.GetUserStatistics(getStatsRequest, CallbackWrapper(GetStatsCallback2, test));
        };
        var GetStatsCallback2 = function (error, result) {
            test.ok(error == null, "GetUserStats failed");
            test.ok(result != null, "GetUserStats failed");
            test.ok(result.data.UserStatistics != null, "GetUserStats failed");
            test.ok(result.data.UserStatistics.hasOwnProperty(testConstants.TEST_STAT_NAME), "GetUserStats failed");
            
            var actualtestNumber = result.data.UserStatistics[testConstants.TEST_STAT_NAME];
            
            test.equal(testData.testNumber, actualtestNumber, "" + testData.testNumber + "!=" + actualtestNumber);
            test.done();
        };
        
        // Kick off this test process
        PlayFabClient.GetUserStatistics(getStatsRequest, CallbackWrapper(GetStatsCallback1, test));
    }),
    UserCharacter: TestWrapper(function (test) {
        var getCharsRequest = {};
        var grantCharRequest = {
            TitleId: titleData.titleId,
            PlayFabId: testData.playFabId,
            CharacterName: titleData.CHAR_NAME,
            CharacterType: titleData.CHAR_TEST_TYPE
        };
        
        var OptionalGetCharsCallback = function (error, result) {
            // First get chars falls back upon grant-char if target character not present
            if (result == null) {
                // Register the character and try again
                PlayFabServer.GrantCharacterToUser(grantCharRequest, CallbackWrapper(GrantCharCallback, test));
            }
            else {
                // Confirm the successful login
                MandatoryGetCharsCallback(error, result);
            }
        };
        var GrantCharCallback = function (error, result) {
            // Second character callback MUST succeed
            test.ok(error == null, "GrantCharacter failed");
            test.ok(result != null, "GrantCharacter failed");
            
            // Get chars again, this time with the newly granted character
            PlayFabClient.GetAllUsersCharacters(getCharsRequest, CallbackWrapper(MandatoryGetCharsCallback, test));
        };
        var MandatoryGetCharsCallback = function (error, result) {
            // GetChars MUST succeed at some point during this test
            test.ok(error == null, "GetChars failed");
            test.ok(result != null, "GetChars failed");
            
            for (var i in result.data.Characters)
                if (result.data.Characters[i].CharacterName === titleData.characterName)
                    testData.characterId = result.data.Characters[i].CharacterId; // Save the characterId, it will be used in other tests
            
            test.ok(testData.characterId != null, "Cannot find " + titleData.characterName + " on this account.");
            test.done();
        };
        PlayFabClient.GetAllUsersCharacters(getCharsRequest, CallbackWrapper(OptionalGetCharsCallback, test));
    }),
    LeaderBoard: TestWrapper(function (test) {
        var clientRequest = {
            MaxResultsCount: 3,
            StatisticName: testConstants.TEST_STAT_NAME
        };
        var serverRequest = {
            MaxResultsCount: 3,
            PlayFabId: testData.playFabId,
            CharacterId: testData.characterId,
            StatisticName: testConstants.TEST_STAT_NAME
        };
        
        var callsCompleted = 0;
        
        var GetLeaderboardCallback = function (error, result) {
            test.ok(error == null, "GetLeaderboard failed");
            test.ok(result != null, "GetLeaderboard failed");
            test.ok(result.data.Leaderboard != null, "GetLeaderboard failed");
            test.ok(result.data.Leaderboard.length > 0, "Leaderboard had insufficient entries");
            
            callsCompleted += 1;
            
            if (callsCompleted === 2)
                test.done();
        };
        
        PlayFabClient.GetLeaderboardAroundCurrentUser(clientRequest, CallbackWrapper(GetLeaderboardCallback, test));
        PlayFabServer.GetLeaderboardAroundCharacter(serverRequest, CallbackWrapper(GetLeaderboardCallback, test));
    }),
    AccountInfo: TestWrapper(function (test) {
        var GetAccountInfoCallback = function (error, result) {
            test.ok(error == null, "GetAccountInfo failed");
            test.ok(result != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo.Origination != null, "GetAccountInfo failed");
            test.ok(result.data.AccountInfo.TitleInfo.Origination.length > 0, "GetAccountInfo string-Enum failed");
            test.done();
        };
        
        PlayFabClient.GetAccountInfo({}, CallbackWrapper(GetAccountInfoCallback, test));
    }),
    CloudScript: TestWrapper(function (test) {
        if (PlayFab._internalSettings.logicServerUrl == null) {
            var getCloudUrlRequest = {};
            
            var GetCloudScriptUrlCallback = function (error, result) {
                test.ok(error == null, "GetCloudUrl failed");
                test.ok(result != null, "GetCloudUrl failed");
                
                if (PlayFab._internalSettings.logicServerUrl != null) {
                    exports.PlayFabApiTests.CloudScript(test); // Recursively call this test to get the case below
                }
                else
                    test.ok(false, "GetCloudScriptUrl did not retrieve the logicServerUrl");
            };
            
            PlayFabClient.GetCloudScriptUrl(getCloudUrlRequest, CallbackWrapper(GetCloudScriptUrlCallback, test));
        } else {
            var helloWorldRequest = { ActionId: "helloWorld" };
            
            var HelloWorldCallback = function (error, result) {
                test.ok(error == null, "HelloWorld failed");
                test.ok(result != null, "HelloWorld failed");
                test.ok(result.data.Results != null, "HelloWorld failed");
                test.ok(result.data.Results.messageValue != null, "HelloWorld failed");
                test.equal(result.data.Results.messageValue, "Hello " + testData.playFabId + "!", "Unexpected HelloWorld cloudscript result: " + result.data.Results.messageValue);
                test.done();
            };
            
            PlayFabClient.RunCloudScript(helloWorldRequest, CallbackWrapper(HelloWorldCallback, test));
        }
    }),
};
