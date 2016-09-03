-- This example runs the internal PlayFab test-suite (not required)
--   and prints the results of those tests to the console when complete

local PlayFabApiTestSuite = require("PlayFabTesting.PlayFabApiTestSuite")

PlayFabApiTestSuite.Start()
while (not PlayFabApiTestSuite.IsFinished()) do
    PlayFabApiTestSuite.Update()
end

print(PlayFabApiTestSuite.GenerateTestSummary())

PlayFabApiTestSuite.SendJenkernaughtReport()
