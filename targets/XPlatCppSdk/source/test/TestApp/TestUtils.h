// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include "TestDataTypes.h"

namespace PlayFabUnit
{
    const char* ToString(TestActiveState state);
    const char* ToString(TestFinishState state);

    TimePoint TestTimeNow();

    template<class T> T TestTimeDelta(TimePoint earlier, TimePoint later)
    {
        return std::chrono::duration_cast<T>(later - earlier);
    }
}