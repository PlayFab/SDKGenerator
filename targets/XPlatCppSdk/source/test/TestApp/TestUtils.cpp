// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include "TestUtils.h"

namespace PlayFabUnit
{
    const char* ToString(TestActiveState state)
    {
        switch (state)
        {
            case TestActiveState::PENDING: return "PENDING";
            case TestActiveState::ACTIVE: return "ACTIVE";
            case TestActiveState::READY: return "READY";
            case TestActiveState::COMPLETE: return "COMPLETE";
            case TestActiveState::ABORTED: return "ABORTED";
            default: return "UNKNOWN";
        }
    }

    const char* ToString(TestFinishState state)
    {
        switch (state)
        {
            case TestFinishState::PENDING: return "PENDING";
            case TestFinishState::PASSED: return "PASSED";
            case TestFinishState::FAILED: return "FAILED";
            case TestFinishState::SKIPPED: return "SKIPPED";
            case TestFinishState::TIMEDOUT: return "TIMEDOUT";
            default: return "UNKNOWN";
        }
    }

    TimePoint TestTimeNow()
    {
        return std::chrono::system_clock::now();
    }
}
