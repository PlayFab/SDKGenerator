// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include "TestDataTypes.h"

namespace PlayFabUnit
{
    class TestTitleDataLoader
    {
        public:
            static bool Load(TestTitleData& titleData);

        private:
            static bool LoadTestJson(std::shared_ptr<char*>& testDataJsonPtr, size_t& testDataJsonLen);
    };
}
