-- This is a very lightweight, no dependencies, testing suite for the PlayFab LuaSdk
-- Unfortunately, very few of the Lua testing libraries support async results (IE, determining test success/failure after the initial test call has returned)
-- This is not intended to be a robust testing suite for use outside of the PlayFab LuaSdk
-- It's not very good at handling errors or problems within itself yet, and it needs a lot of work to become a full testing system

-- local json = require("PlayFab.json") -- For debugging

-- For timestamps, get socket however we can on any platform (tested for LuaDist and Defold)
local pfSocket = nil
function GetSocket1() pfSocket = socket end -- Defold
function GetSocket2() pfSocket = require("socket") end -- LuaDist Console
pcall(GetSocket1)
pcall(GetSocket2)

local AsyncTestSuite = {
    _advanceToNextTest = false,
    _testsFinished = false,
    _suiteTestList = {},
    _scheduledCoroutines = {},
    _activeTestIndex = 0, -- Lua is 1-indexed, so 0 implies unstarted
    _pfTestReport = {
        name = nil, -- The name of the suite - usually buildIdentifier
        tests = 0,
        failures = 0,
        time = 0.0,
        _startTime = 0.0, -- Internal temp var
        testResults = {}
    },
}

--  Initialize the test suite, and set the global name for all tests in the suite
function AsyncTestSuite.Init(buildIdentifier)
    AsyncTestSuite._pfTestReport.name = buildIdentifier
    AsyncTestSuite._advanceToNextTest = false
    AsyncTestSuite._testsFinished = false
end

-- Add every test that should be tracked by this suite
function AsyncTestSuite.AddTest(testName, testFunc)
    AsyncTestSuite._pfTestReport.tests = AsyncTestSuite._pfTestReport.tests + 1
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._pfTestReport.tests] = {
        classname = AsyncTestSuite._pfTestReport.name,
        name = testName,
        time = 0.0,
        _startTime = 0.0, -- Internal temp var
        message = "Test Pending ...",
        failureText = "PENDING",
    }
    AsyncTestSuite._suiteTestList[AsyncTestSuite._pfTestReport.tests] = testFunc
end

-- Once all tests are added, BeginTesting
function AsyncTestSuite.BeginTesting()
    AsyncTestSuite._advanceToNextTest = true
    AsyncTestSuite._pfTestReport._startTime = pfSocket.gettime()
end

-- Internal function which triggers each individual test
function AsyncTestSuite._StartTest()
    AsyncTestSuite._activeTestIndex = AsyncTestSuite._activeTestIndex + 1
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex]._startTime = pfSocket.gettime()
    local success, err = pcall(AsyncTestSuite._suiteTestList[AsyncTestSuite._activeTestIndex])
    if (not success) then
        AsyncTestSuite.EndTest("FAILED", err)
    end
end

-- Tick will do nothing until BeginTesting() is called, should be called regularly while tests are running
function AsyncTestSuite.Tick()
    -- This needs a lot of improvement like timeouts, but for now, just ass.u.me that a test will end itself, and call the next one after it does
    if (AsyncTestSuite._advanceToNextTest) then
        AsyncTestSuite._advanceToNextTest = false
        if (AsyncTestSuite._activeTestIndex < AsyncTestSuite._pfTestReport.tests) then
            AsyncTestSuite._StartTest()
        else
            AsyncTestSuite._testsFinished = true
        end
    end

    -- Rudimentary scheduler for coroutines created by tests (arbitrary async operations)
    for coName, eachCo in pairs(AsyncTestSuite._scheduledCoroutines) do
        local success, err = pcall(AsyncTestSuite._TickCoroutine(coName, eachCo))
        if (not success) then
            AsyncTestSuite.EndTest("FAILED", "Error in Coroutine: " .. coName .. "\nDetails: " .. err)
        end
    end

    if (AsyncTestSuite._testsFinished and AsyncTestSuite._pfTestReport.time == 0.0) then
        AsyncTestSuite._pfTestReport.time = pfSocket.gettime() - AsyncTestSuite._pfTestReport._startTime
        AsyncTestSuite._pfTestReport._startTime = nil -- Hide this from the final json report
    end
end

function AsyncTestSuite._TickCoroutine(coName, eachCo)
    return function()
        if (not coroutine.resume(eachCo)) then -- Run each coroutine
            AsyncTestSuite._scheduledCoroutines[coName] = nil -- De-schedule finished coroutines
        end
    end
end

function AsyncTestSuite.ScheduleCoroutine(name, co)
    if (AsyncTestSuite._scheduledCoroutines[name]) then
        error("Test coroutine is already scheduled: " .. name)
    end
    AsyncTestSuite._scheduledCoroutines[name] = co
end

function AsyncTestSuite.WrapCallback(name, func)
    return function(...)
        local success, err = pcall(func, ...)
        if (not success) then
            AsyncTestSuite.EndTest("FAILED", "Wrapped callback failed: " .. name .. "\n" .. err)
        end
    end
end

-- endState should be "PASSED" or "FAILED"
function AsyncTestSuite.EndTest(endState, message)
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex].time = pfSocket.gettime() - AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex]._startTime
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex]._startTime = nil -- Hide this from the final json report
    if (AsyncTestSuite._advanceToNextTest) then
        -- This block is temporary until each test has a reference to its own testContext
        print("Test has unexpectedly ended multiple times:\n" .. message .. "\n" .. AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex].message)
    end
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex].message = message
    AsyncTestSuite._pfTestReport.testResults[AsyncTestSuite._activeTestIndex].failureText = endState
    if (not (endState == "PASSED")) then
        AsyncTestSuite._pfTestReport.failures = AsyncTestSuite._pfTestReport.failures + 1
    end
    AsyncTestSuite._advanceToNextTest = true
end

function AsyncTestSuite.IsFinished()
    return AsyncTestSuite._testsFinished
end

function AsyncTestSuite.GenerateTestSummary()
    local output = ""
    local eachLine
    for index, eachTest in pairs(AsyncTestSuite._pfTestReport.testResults) do
        eachLine = string.format("%.0f", (eachTest.time*1000))
        while (string.len(eachLine) < 8) do
            eachLine = " " .. eachLine
        end
        eachLine = eachLine .. " - " .. eachTest.name .. ": " .. eachTest.failureText
        if (eachTest.message) then
            eachLine = eachLine .. " - " .. eachTest.message
        end
        output = output .. eachLine .. "\n"
    end

    if (AsyncTestSuite._testsFinished) then
        eachLine = "Testing Complete. (" .. tostring(AsyncTestSuite._pfTestReport.tests - AsyncTestSuite._pfTestReport.failures) .. "/" .. tostring(AsyncTestSuite._pfTestReport.tests) .. ") tests passed in " .. string.format("%.3f", (AsyncTestSuite._pfTestReport.time)) .. " seconds.\n"
        output = output .. eachLine .. "\n"
    end

    return output
end

function AsyncTestSuite.GetJenkernaughtReport()
    -- TODO: Hook up this report and give it back to Jenkernaught for reporting in Jenkins
    return AsyncTestSuite._pfTestReport
end

return AsyncTestSuite
