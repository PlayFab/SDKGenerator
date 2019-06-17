// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include "TestContext.h"
#include "TestUtils.h"

namespace PlayFabUnit
{
    void TestContext::EndTest(TestFinishState state, std::string resultMsg)
    {
        if (finishState == TestFinishState::PENDING) // This means that we finish successfully
        {
            endTime = TestTimeNow();
            testResultMsg = resultMsg;
            finishState = state;
            activeState = TestActiveState::READY;
        }
        else if (finishState == TestFinishState::PASSED)
        {
            switch (state)
            {
                case PlayFabUnit::TestFinishState::PASSED:
                    testResultMsg += "Test try to Pass twice for some reason.\n";
                    break;
                case PlayFabUnit::TestFinishState::FAILED:
                    testResultMsg += "Test try to Fail after Passing.\n";
                    break;
                case PlayFabUnit::TestFinishState::SKIPPED:
                    testResultMsg += "Test try to be Skipped after Passing.\n";
                    break;
                case PlayFabUnit::TestFinishState::TIMEDOUT:
                    testResultMsg += "Test try to Timeout after Passing.\n";
                    break;
                default:
                    testResultMsg += "How are you switching back to a Pending state from Passing.\n";
                    break;
            }
        }
        else if(finishState == TestFinishState::FAILED) 
        {
            switch (state)
            {
                case PlayFabUnit::TestFinishState::PASSED:
                    testResultMsg += "Test try to Pass after Failing.\n";
                    break;
                case PlayFabUnit::TestFinishState::FAILED:
                    testResultMsg += "Test try to Fail twice.\n";
                    break;
                case PlayFabUnit::TestFinishState::SKIPPED:
                    testResultMsg += "Test try to be Skipped after Failing.\n";
                    break;
                case PlayFabUnit::TestFinishState::TIMEDOUT:
                    testResultMsg += "Test try to Timeout after Failing.\n";
                    break;
                default:
                    testResultMsg += "How are you switching back to a Pending state from Failing.\n";
                    break;
            }
        }
        else if(finishState == TestFinishState::SKIPPED)
        {
            switch (state)
            {
            case PlayFabUnit::TestFinishState::PASSED:
                testResultMsg += "Test try to Pass after being Skipped.\n";
                break;
            case PlayFabUnit::TestFinishState::FAILED:
                testResultMsg += "Test try to Fail after being Skipped.\n";
                break;
            case PlayFabUnit::TestFinishState::SKIPPED:
                testResultMsg += "Test try to be Skipped twice.\n";
                break;
            case PlayFabUnit::TestFinishState::TIMEDOUT:
                testResultMsg += "Test try to Timeout after being Skipped.\n";
                break;
            default:
                testResultMsg += "How are you switching back to a Pending state from Skipping.\n";
                break;
            }
        }
        else 
        {
            switch (state)
            {
            case PlayFabUnit::TestFinishState::PASSED:
                testResultMsg += "Test try to Pass after being Timeout.\n";
                break;
            case PlayFabUnit::TestFinishState::FAILED:
                testResultMsg += "Test try to Fail after being Timeout.\n";
                break;
            case PlayFabUnit::TestFinishState::SKIPPED:
                testResultMsg += "Test try to be Skipped after being Timeout.\n";
                break;
            case PlayFabUnit::TestFinishState::TIMEDOUT:
                testResultMsg += "Test try to Timeout twice.\n";
                break;
            default:
                testResultMsg += "How are you switching back to a Pending state from Timing Out.\n";
                break;
            }
        }
    }

    void TestContext::Pass(std::string message)
    {
        EndTest(TestFinishState::PASSED, message);
    }

    void TestContext::Fail(std::string message)
    {
        if (message.empty())
            message = "fail";
        EndTest(TestFinishState::FAILED, message);
        // TODO: Throw "assert" exception
    }

    void TestContext::Skip(std::string message)
    {
        EndTest(TestFinishState::SKIPPED, message);
        // TODO: Throw "test skipped" exception
    }
}
