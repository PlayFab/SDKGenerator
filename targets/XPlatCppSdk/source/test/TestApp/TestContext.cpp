// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include "TestContext.h"
#include "TestUtils.h"

namespace PlayFabUnit
{
    void TestContext::EndTest(TestFinishState state, std::string resultMsg)
    {
        if (finishState != TestFinishState::PENDING)
        {
            resultMsg += "You can't mark a test as finished twice.\n";
            if (finishState == TestFinishState::PASSED)
            {
                if (state != TestFinishState::FAILED)
                {
                    testResultMsg += resultMsg;
                    return;
                }
                resultMsg = testResultMsg + resultMsg;
            }
            else
            {
                if (state != TestFinishState::FAILED)
                {
                    resultMsg += "You can't mark a test as finished twice.\n";
                }
                testResultMsg += resultMsg;
                return;
            }
        }

        endTime = TestTimeNow();
        testResultMsg = resultMsg;
        finishState = state;
        activeState = TestActiveState::READY;
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
