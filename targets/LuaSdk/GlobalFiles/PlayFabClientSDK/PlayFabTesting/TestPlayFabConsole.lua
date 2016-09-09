-- This example runs the internal PlayFab test-suite (not required)
--   and prints the results of those tests to the console when complete

local PlayFabApiTestSuite = require("PlayFabTesting.PlayFabApiTestSuite")
local PlayFabSettings = require("PlayFab.PlayFabSettings")

PlayFabApiTestSuite.Start()
while (not PlayFabApiTestSuite.IsFinished()) do
    PlayFabApiTestSuite.Update()
end

-- Display the test results to the console
print(PlayFabApiTestSuite.GenerateTestSummary())

-- Upload the test-results and report upload-status
local function OnSaveSuccess(result)
    print(PlayFabApiTestSuite.playFabId .. ", Test report saved to CloudScript: " .. PlayFabSettings._internalSettings.buildIdentifier)
end
local function OnSaveFail(result)
    print(PlayFabApiTestSuite.playFabId .. ", Failed to save test report to CloudScript: " .. PlayFabSettings._internalSettings.buildIdentifier)
end
PlayFabApiTestSuite.SendJenkernaughtReport(OnSaveSuccess, OnSaveFail)
