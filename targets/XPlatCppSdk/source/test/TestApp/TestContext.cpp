// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include "TestContext.h"
#include "TestUtils.h"

namespace PlayFabUnit
{
    void TestContext::EndTest(TestFinishState state, std::string resultMsg)
    {
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
