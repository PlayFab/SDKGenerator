// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <functional>
#include <string>
#include "TestDataTypes.h"

namespace PlayFabUnit
{
    class TestCase;
    struct TestContext;
    using TestFunc = std::function<void(TestContext&)>;

    struct TestContext
    {
        TestContext(TestCase* testCase, std::string name, TestFunc func) :
            testName(name),
            activeState(TestActiveState::PENDING),
            finishState(TestFinishState::PENDING),
            testResultMsg(),
            testFunc(func),
            testCase(testCase)
        {
        };

        const std::string testName;
        TestActiveState activeState;
        TestFinishState finishState;
        std::string testResultMsg;
        TestFunc testFunc;
        TestCase* testCase;
        TimePoint startTime;
        TimePoint endTime;

        void EndTest(TestFinishState state, std::string resultMsg);

        void Pass(std::string message = "");
        void Fail(std::string message = "");
        void Skip(std::string message = "");
    };
}
