// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <playfab/PlayFabJsonHeaders.h>
#include "TestReport.h"
#include "TestUtils.h"

namespace PlayFabUnit
{
    void TestCaseReport::ToJson(Json::Value& json)
    {
        json["classname"] = classname;
        json["name"] = name;
        json["time"] = time;
        json["message"] = message;
        json["failureText"] = failureText;
        json["finishState"] = ToString(finishState);
    }

    void TestSuiteReport::ToJson(Json::Value& json)
    {
        json["name"] = name;
        json["tests"] = tests;
        json["failures"] = failures;
        json["errors"] = errors;
        json["skipped"] = skipped;
        json["time"] = time;
#if defined(PLAYFAB_PLATFORM_IOS) || defined(PLAYFAB_PLATFORM_ANDROID)
        json["timestamp"] = static_cast<Json::Int64>(std::chrono::system_clock::to_time_t(timeStamp));
#else // PLAYFAB_PLATFORM_IOS || PLAYFAB_PLATFORM_ANDROID
        json["timestamp"] = std::chrono::system_clock::to_time_t(timeStamp);
#endif // PLAYFAB_PLATFORM_IOS || PLAYFAB_PLATFORM_ANDROID

        json["testResults"];
        Json::Value init(Json::arrayValue);
        json["testResults"].swapPayload(init);

        int testResultIndex = 0;
        for (auto it = testResults.begin(); it != testResults.end(); ++it)
        {
            (**it)->ToJson(json["testResults"][testResultIndex]);
            testResultIndex += 1;
        }
    }

    TestReport::TestReport(std::string className)
    {
        internalReport.name = className;
        internalReport.timeStamp = TestTimeNow();
    }

    void TestReport::TestStarted()
    {
        internalReport.tests += 1;
    }

    void TestReport::TestComplete(std::string testName, TestFinishState testFinishState, TimeValueMs testDurationMs, std::string message)
    {
        // Add a new TestCaseReport for the completed test.
        TestCaseReport* testReport = new TestCaseReport();

        std::shared_ptr<TestCaseReport*> testReportPtr = std::make_shared<TestCaseReport*>(testReport);
        internalReport.testResults.push_back(testReportPtr);

        testReport->classname = internalReport.name;
        testReport->name = testName;
        testReport->time = std::chrono::duration<double>(testDurationMs).count();
        testReport->message = message;
        testReport->finishState = testFinishState;
        testReport->failureText = ToString(testFinishState);

        // Update statistics.
        switch (testFinishState)
        {
            case TestFinishState::PASSED: internalReport.passed += 1; break;
            case TestFinishState::FAILED: internalReport.failures += 1; break;
            case TestFinishState::SKIPPED: internalReport.skipped += 1; break;
        }

        // Update overall runtime.
        // TODO: Add hooks for SuiteSetUp and SuiteTearDown, so this can be estimated more accurately
        internalReport.time = std::chrono::duration<double>(TestTimeNow() - internalReport.timeStamp).count(); // For now, update the duration on every test complete - the last one will be essentially correct
    }

    bool TestReport::AllTestsPassed()
    {
        return (internalReport.tests > 0) &&
            ((internalReport.passed + internalReport.skipped) == internalReport.tests) &&
            (0 == internalReport.failures);
    }
}