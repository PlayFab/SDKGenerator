// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <list>
#include <string>
#include "TestDataTypes.h"
#include "TestReport.h"

namespace PlayFabUnit
{
    struct TestContext;
    class TestCase;

    class TestRunner
    {
        private:
            TestActiveState suiteState;
            TestCase* suiteTestCase;
            std::list<std::shared_ptr<TestContext*>> suiteTests;

            void ManageTestCase(TestCase* newTestCase, TestCase* oldTestCase);

            std::string GenerateTestSummary();

        public:
            std::string suiteTestSummary;
            TestReport suiteTestReport;

            TestRunner();

            void Add(TestCase& testCase);

            void Run();

            bool AllTestsPassed();
    };
}