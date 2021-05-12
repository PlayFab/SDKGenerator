-- This is a test suite for testing all the basic APIs and edge cases on the PlayFab API
-- This is not intended to be a robust testing suite for use outside of the PlayFab LuaSdk

local json = require("PlayFab.json")
local PlayFabClientApi = require("PlayFab.PlayFabClientApi")
local PlayFabAuthenticationApiExists, PlayFabAuthenticationApi = pcall(require, "PlayFab.PlayFabAuthenticationApi")
local PlayFabDataApiExists, PlayFabDataApi = pcall(require, "PlayFab.PlayFabDataApi")
-- Most users won't need to import PlayFabSettings, as the public settings are available via PlayFabClientApi.settings
local PlayFabSettings = require("PlayFab.PlayFabSettings")
local AsyncTestSuite = require("PlayFabTesting.AsyncTestSuite")

local function read_file(path)
    local file = io.open(path, "rb") -- r read mode and b binary mode
    if not file then return nil end
    local content = file:read "*a" -- *a or *all reads the whole file
    file:close()
    return content
end

-- Always set your titleId first, before making any API calls
local testTitleDataFilename = os.getenv("PF_TEST_TITLE_DATA_JSON") -- Set the PF_TEST_TITLE_DATA_JSON env-var to the path of a testTitleData.json file (described here: https://github.com/PlayFab/SDKGenerator/blob/master/JenkinsConsoleUtility/testTitleData.md)
if (testTitleDataFilename) then
    local testData = json.decode(read_file(testTitleDataFilename))
    PlayFabClientApi.settings.titleId = testData.titleId
else
    error("PF_TEST_TITLE_DATA_JSON environment variable not set")
end

local buildIdentifier = PlayFabSettings._internalSettings.buildIdentifier

local PlayFabApiTestSuite = {
    -- TEST CONSTANTS
    TEST_DATA_KEY = "testCounter",
    TEST_STAT_NAME = "str",

    -- TEST VARIABLES
    playFabId = nil,
    entityId = nil,
    entityType = nil,
    testNumber = nil,
    testStatValue = nil,
}

-- HELPER FUNCTIONS
function PlayFabApiTestSuite.OnInvalidSuccess(result)
    AsyncTestSuite.EndTest("FAILED", "Unexpected api success: " .. json.encode(result))
end

function PlayFabApiTestSuite.OnSharedError(error)
    AsyncTestSuite.EndTest("FAILED", "Unexpected api failure: " .. json.encode(error))
end

-- TESTING SECTION
--- <summary>
--- CLIENT API
--- Try to deliberately log in with an inappropriate password,
---   and verify that the error displays as expected.
--- </summary>
function PlayFabApiTestSuite.InvalidLoginTest()
    local invalidRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/authentication/loginwithemailaddress
        Email = "paul@playfab.com",
        Password = "INVALID"
    }
    PlayFabClientApi.LoginWithEmailAddress(invalidRequest, AsyncTestSuite.WrapCallback("OnInvalidSuccess", PlayFabApiTestSuite.OnInvalidSuccess), AsyncTestSuite.WrapCallback("InvalidLoginError", PlayFabApiTestSuite.InvalidLoginError))
end
function PlayFabApiTestSuite.InvalidLoginError(error)
    if (string.find(string.lower(error.errorMessage), "password")) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "Invalid login did not report about invalid password: " .. json.encode(error))
    end
end

--- <summary>
--- CLIENT API
--- Try to deliberately register a user with an invalid email and password
---   Verify that errorDetails are populated correctly.
--- </summary>
function PlayFabApiTestSuite.InvalidRegistrationTest()
    local invalidRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/authentication/registerplayfabuser
        Username = "x",
        Email = "x",
        Password = "x"
    }
    PlayFabClientApi.RegisterPlayFabUser(invalidRequest, AsyncTestSuite.WrapCallback("OnInvalidSuccess", PlayFabApiTestSuite.OnInvalidSuccess), AsyncTestSuite.WrapCallback("InvalidRegistrationError", PlayFabApiTestSuite.InvalidRegistrationError))
end
function PlayFabApiTestSuite.InvalidRegistrationError(error)
    local fullJson = string.lower(json.encode(error))

    local expectedEmailMsg = "email address is not valid."
    if (not string.find(fullJson, expectedEmailMsg)) then
        AsyncTestSuite.EndTest("FAILED", "Invalid registration did not find target log-string: " .. json.encode(error) .. " missing: " .. expectedEmailMsg)
        return
    end

    local expectedPasswordMsg = "password must be between"
    if (not string.find(fullJson, expectedPasswordMsg)) then
        AsyncTestSuite.EndTest("FAILED", "Invalid registration did not find target log-string: " .. json.encode(error) .. " missing: " .. expectedPasswordMsg)
        return
    end

    AsyncTestSuite.EndTest("PASSED", nil)
end

--- <summary>
--- CLIENT API
--- Log in or create a user, track their PlayFabId
--- </summary>
function PlayFabApiTestSuite.LoginOrRegisterTest()
    local loginRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/authentication/loginwithcustomid
        CustomId = buildIdentifier,
        CreateAccount = true
    }
    PlayFabClientApi.LoginWithCustomID(loginRequest, AsyncTestSuite.WrapCallback("OnLoginSuccess", PlayFabApiTestSuite.OnLoginSuccess), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnLoginSuccess(result)
    if (result.PlayFabId) then 
        PlayFabApiTestSuite.playFabId = result.PlayFabId
        AsyncTestSuite.EndTest("PASSED", PlayFabApiTestSuite.playFabId)
    else
        AsyncTestSuite.EndTest("FAILED", "PlayFabId not found in login result" .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test a sequence of calls that modifies saved data,
---   and verifies that the next sequential API call contains updated data.
--- Verify that the data is correctly modified on the next call.
--- Parameter types tested: string, Dictionary<string, string>, DateTime
--- </summary>
function PlayFabApiTestSuite.UserDataApi()
    local getDataRequest = {} -- null also works
    PlayFabClientApi.GetUserData(getDataRequest, AsyncTestSuite.WrapCallback("OnGetUserData1", PlayFabApiTestSuite.OnGetUserData1), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetUserData1(result)
    PlayFabApiTestSuite.testNumber = 0
    if (result.Data and result.Data[PlayFabApiTestSuite.TEST_DATA_KEY]) then
        PlayFabApiTestSuite.testNumber = tonumber(result.Data[PlayFabApiTestSuite.TEST_DATA_KEY].Value)
    end
    PlayFabApiTestSuite.testNumber = (PlayFabApiTestSuite.testNumber + 1) % 100 -- This test is about the expected value changing - but not testing more complicated issues like bounds

    local updateRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/admin/player-data-management/updateuserdata
        Data = {}
    }
    updateRequest.Data[PlayFabApiTestSuite.TEST_DATA_KEY] = tostring(PlayFabApiTestSuite.testNumber)
    PlayFabClientApi.UpdateUserData(updateRequest, AsyncTestSuite.WrapCallback("OnUpdateUserData", PlayFabApiTestSuite.OnUpdateUserData), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnUpdateUserData(result)
    local getDataRequest = {} -- null also works
    PlayFabClientApi.GetUserData(getDataRequest, AsyncTestSuite.WrapCallback("OnGetUserData2", PlayFabApiTestSuite.OnGetUserData2), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetUserData2(result)
    local actualValue = -1000
    if (result.Data and result.Data[PlayFabApiTestSuite.TEST_DATA_KEY]) then
        actualValue = tonumber(result.Data[PlayFabApiTestSuite.TEST_DATA_KEY].Value)
    end
    
    if (actualValue == PlayFabApiTestSuite.testNumber) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "UserDataApi failed: " .. tostring(PlayFabApiTestSuite.testNumber) .. " != " .. tostring(actualValue) .. " Json: " .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test a sequence of calls that modifies saved data,
---   and verifies that the next sequential API call contains updated data.
--- Verify that the data is saved correctly, and that specific types are tested
--- Parameter types tested: Dictionary<string, int> 
--- </summary>
function PlayFabApiTestSuite.PlayerStatisticsApi()
    local getStatRequest = {}
    PlayFabClientApi.GetPlayerStatistics(getStatRequest, AsyncTestSuite.WrapCallback("OnGetStat1", PlayFabApiTestSuite.OnGetStat1), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetStat1(result)
    PlayFabApiTestSuite.testStatValue = 0
    for index, eachStat in pairs(result.Statistics) do
        if (eachStat.StatisticName == PlayFabApiTestSuite.TEST_STAT_NAME) then
            PlayFabApiTestSuite.testStatValue = eachStat.Value
        end
    end
    PlayFabApiTestSuite.testStatValue = (PlayFabApiTestSuite.testStatValue + 1) % 100 -- This test is about the expected value changing - but not testing more complicated issues like bounds

    local updateRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/admin/player-data-management/updateuserdata
        Statistics = {{ StatisticName = PlayFabApiTestSuite.TEST_STAT_NAME, Value = PlayFabApiTestSuite.testStatValue }}
    }
    PlayFabClientApi.UpdatePlayerStatistics(updateRequest, AsyncTestSuite.WrapCallback("OnUpdateStat", PlayFabApiTestSuite.OnUpdateStat), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnUpdateStat(result)
    local getStatRequest = {}
    PlayFabClientApi.GetPlayerStatistics(getStatRequest, AsyncTestSuite.WrapCallback("OnGetStat2", PlayFabApiTestSuite.OnGetStat2), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetStat2(result)
    local actualValue = -1000
    for index, eachStat in pairs(result.Statistics) do
        if (eachStat.StatisticName == PlayFabApiTestSuite.TEST_STAT_NAME) then
            actualValue = eachStat.Value
        end
    end
    
    if (actualValue == PlayFabApiTestSuite.testStatValue) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "PlayerStatisticsApi failed: " .. tostring(PlayFabApiTestSuite.testStatValue) .. " != " .. tostring(actualValue) .. " Json: " .. json.encode(result))
    end
end

--- <summary>
--- SERVER API
--- Get or create the given test character for the given user
--- Parameter types tested: Contained-Classes, string
--- </summary>
function PlayFabApiTestSuite.UserCharacter()
    getCharsRequest = {}
    PlayFabClientApi.GetAllUsersCharacters(getCharsRequest, AsyncTestSuite.WrapCallback("OnGetChars", PlayFabApiTestSuite.OnGetChars), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetChars(result)
    -- This test has lost its usefulness as we can't actually expect characters to be there now (We don't create them in this test)
    AsyncTestSuite.EndTest("PASSED", nil)
end

--- <summary>
--- CLIENT AND SERVER API
--- Test that leaderboard results can be requested
--- Parameter types tested: List of contained-classes
--- </summary>
function PlayFabApiTestSuite.LeaderBoard()
    local clientRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/player-data-management/getleaderboard
        MaxResultsCount = 3,
        StatisticName = PlayFabApiTestSuite.TEST_STAT_NAME
    }
    PlayFabClientApi.GetLeaderboard(clientRequest, AsyncTestSuite.WrapCallback("OnLeaderboard", PlayFabApiTestSuite.OnLeaderboard), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnLeaderboard(result)
    if (table.getn(result.Leaderboard) > 0) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "LeaderBoard results not found, Json: " .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test that AccountInfo can be requested
--- Parameter types tested: List of enum-as-strings converted to list of enums
--- </summary>
function PlayFabApiTestSuite.AccountInfo()
    PlayFabClientApi.GetAccountInfo({}, AsyncTestSuite.WrapCallback("OnAccountInfo", PlayFabApiTestSuite.OnAccountInfo), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnAccountInfo(result)
    if (result.AccountInfo.TitleInfo.Origination) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "OnAccountInfo origination not found: " .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test that CloudScript can be properly set up and invoked
--- </summary>
function PlayFabApiTestSuite.CloudScript()
    local helloWorldRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/server-side-cloud-script/executecloudscript
        FunctionName = "helloWorld"
    }
    PlayFabClientApi.ExecuteCloudScript(helloWorldRequest, AsyncTestSuite.WrapCallback("OnHelloWorld", PlayFabApiTestSuite.OnHelloWorld), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnHelloWorld(result)
    if (result.FunctionResult.messageValue == "Hello " .. PlayFabApiTestSuite.playFabId .. "!") then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "HelloWorld response not found: " .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test that CloudScript errors can be deciphered
--- </summary>
function PlayFabApiTestSuite.CloudScriptError()
    local errRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/server-side-cloud-script/executecloudscript
        FunctionName = "throwError"
    }
    PlayFabClientApi.ExecuteCloudScript(errRequest, AsyncTestSuite.WrapCallback("OnCloudScriptError", PlayFabApiTestSuite.OnCloudScriptError), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnCloudScriptError(result)
    local passed = true
    passed = passed and (result.FunctionResult == nil)
    passed = passed and not (result.Error == nil)
    passed = passed and (result.Error.Error == "JavascriptException")
    if (passed) then
        AsyncTestSuite.EndTest("PASSED", nil)
    else
        AsyncTestSuite.EndTest("FAILED", "Cloud Script failure did not report correctly.")
    end
end

--- <summary>
--- CLIENT API
--- Test that the client can publish custom PlayStream events
--- </summary>
function PlayFabApiTestSuite.WriteEvent()
    local writeEventRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/analytics/writeplayerevent
        EventName = "ForumPostEvent",
        Body = {
            Subject = "My First Post",
            Body = "This is my awesome post."
        }
    }
    PlayFabClientApi.WritePlayerEvent(writeEventRequest, AsyncTestSuite.WrapCallback("OnWriteEvent", PlayFabApiTestSuite.OnWriteEvent), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnWriteEvent(result)
    AsyncTestSuite.EndTest("PASSED", nil)
end

--- <summary>
--- ENTITY API
--- Verify that a client login can be converted into an entity token
--- </summary>
function PlayFabApiTestSuite.GetEntityToken()
    local getTokenRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/authentication/authentication/getentitytoken
    }
    PlayFabAuthenticationApi.GetEntityToken(getTokenRequest, AsyncTestSuite.WrapCallback("OnGetEntityToken", PlayFabApiTestSuite.OnGetEntityToken), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetEntityToken(result)
    if (result.Entity) then 
        PlayFabApiTestSuite.entityId = result.Entity.Id
        PlayFabApiTestSuite.entityType = result.Entity.Type
        AsyncTestSuite.EndTest("PASSED", result.Entity.Id)
    else
        AsyncTestSuite.EndTest("FAILED", "EntityId not found in GetEntityToken result" .. json.encode(result))
    end
end

--- <summary>
--- CLIENT API
--- Test a sequence of calls that modifies entity objects,
---   and verifies that the next sequential API call contains updated information.
--- Verify that the object is correctly modified on the next call.
--- </summary>
function PlayFabApiTestSuite.ObjectApi()
    local getObjRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/data/object/getobjects
        Entity = {
            Id = PlayFabApiTestSuite.entityId,
            Type = PlayFabApiTestSuite.entityType,
        },
        EscapeObject = true,
    }
    PlayFabDataApi.GetObjects(getObjRequest, AsyncTestSuite.WrapCallback("OnGetObj1", PlayFabApiTestSuite.OnGetObj1), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetObj1(result)
    PlayFabApiTestSuite.testNumber = 0
    if (result.Objects and result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY] and result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY].ObjectName == PlayFabApiTestSuite.TEST_DATA_KEY) then
        PlayFabApiTestSuite.testNumber = tonumber(result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY].EscapedDataObject)
    end
    PlayFabApiTestSuite.testNumber = (PlayFabApiTestSuite.testNumber + 1) % 100 -- This test is about the expected value changing - but not testing more complicated issues like bounds

    local updateRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/data/object/setobjects
        Entity = {
            Id = PlayFabApiTestSuite.entityId,
            Type = PlayFabApiTestSuite.entityType,
        },
        Objects = {
            {
                ObjectName = PlayFabApiTestSuite.TEST_DATA_KEY,
                DataObject = PlayFabApiTestSuite.testNumber,
            }
        },
    }
    PlayFabDataApi.SetObjects(updateRequest, AsyncTestSuite.WrapCallback("OnSetObj", PlayFabApiTestSuite.OnSetObj), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnSetObj(result)
    local getObjRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/data/object/getobjects
        Entity = {
            Id = PlayFabApiTestSuite.entityId,
            Type = PlayFabApiTestSuite.entityType,
        },
        EscapeObject = true,
    }
    PlayFabDataApi.GetObjects(getObjRequest, AsyncTestSuite.WrapCallback("OnGetObj2", PlayFabApiTestSuite.OnGetObj2), PlayFabApiTestSuite.OnSharedError)
end
function PlayFabApiTestSuite.OnGetObj2(result)
    local actualValue = -1000
    if (result.Objects and result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY] and result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY].ObjectName == PlayFabApiTestSuite.TEST_DATA_KEY) then
        actualValue = tonumber(result.Objects[PlayFabApiTestSuite.TEST_DATA_KEY].EscapedDataObject)
    end
    
    if (actualValue == PlayFabApiTestSuite.testNumber) then
        AsyncTestSuite.EndTest("PASSED", actualValue)
    else
        AsyncTestSuite.EndTest("FAILED", "ObjectApi failed: " .. tostring(PlayFabApiTestSuite.testNumber) .. " != " .. tostring(actualValue) .. " Json: " .. json.encode(result))
    end
end

-- TEST SUITE MANAGEMENT SECTION
function PlayFabApiTestSuite.Start()
    AsyncTestSuite.Init(buildIdentifier)
    AsyncTestSuite.AddTest("InvalidLoginTest", PlayFabApiTestSuite.InvalidLoginTest)
    AsyncTestSuite.AddTest("InvalidRegistrationTest", PlayFabApiTestSuite.InvalidRegistrationTest)
    AsyncTestSuite.AddTest("LoginOrRegisterTest", PlayFabApiTestSuite.LoginOrRegisterTest)
    AsyncTestSuite.AddTest("UserDataApi", PlayFabApiTestSuite.UserDataApi)
    AsyncTestSuite.AddTest("PlayerStatisticsApi", PlayFabApiTestSuite.PlayerStatisticsApi)
    AsyncTestSuite.AddTest("UserCharacter", PlayFabApiTestSuite.UserCharacter)
    AsyncTestSuite.AddTest("LeaderBoard", PlayFabApiTestSuite.LeaderBoard)
    AsyncTestSuite.AddTest("AccountInfo", PlayFabApiTestSuite.AccountInfo)
    AsyncTestSuite.AddTest("CloudScript", PlayFabApiTestSuite.CloudScript)
    AsyncTestSuite.AddTest("CloudScriptError", PlayFabApiTestSuite.CloudScriptError)
    AsyncTestSuite.AddTest("WriteEvent", PlayFabApiTestSuite.WriteEvent)
    if (PlayFabAuthenticationApiExists and PlayFabDataApiExists) then
        AsyncTestSuite.AddTest("GetEntityToken", PlayFabApiTestSuite.GetEntityToken)
        AsyncTestSuite.AddTest("ObjectApi", PlayFabApiTestSuite.ObjectApi)
    end
    AsyncTestSuite.BeginTesting()
end

function PlayFabApiTestSuite.GenerateTestSummary()
    return AsyncTestSuite.GenerateTestSummary()
end

function PlayFabApiTestSuite.SendJenkernaughtReport(OnSaveSuccess, OnSaveFail)
    local pfTestReport = AsyncTestSuite.GetJenkernaughtReport()

    local saveResultsRequest = {
        -- Currently, you need to look up the correct format for this object in the API-docs:
        --   https://docs.microsoft.com/rest/api/playfab/client/server-side-cloud-script/executecloudscript
        FunctionName = "SaveTestData",
        FunctionParameter = {
            customId = buildIdentifier,
            testReport = {pfTestReport}
        },
        GeneratePlayStreamEvent = true
    }
    if (PlayFabClientApi.IsClientLoggedIn()) then
        PlayFabClientApi.ExecuteCloudScript(saveResultsRequest, OnSaveSuccess, OnSaveFail)
    else
        OnSaveFail(nil) -- Could not save the test results
    end
end

function PlayFabApiTestSuite.IsFinished()
    return AsyncTestSuite.IsFinished()
end

function PlayFabApiTestSuite.Update()
    AsyncTestSuite.Tick()
end

return PlayFabApiTestSuite
