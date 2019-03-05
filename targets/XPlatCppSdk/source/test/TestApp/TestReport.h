// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <list>
#include <string>
#include "TestDataTypes.h"

namespace Json
{
    class Value;
}

namespace PlayFabUnit
{
    /// <summary>
    /// Data container defining the test-case data saved to JUnit XML format
    /// </summary>
    class TestCaseReport
    {
        public:
            std::string classname; // suite class name
            std::string name; // test name
            double time; // Duration in seconds
            // Sub-Fields in the XML spec
            /// <summary> message is the descriptive text used to debug the test failure </summary>
            std::string message;
            /// <summary> The xml spec allows failureText to be an arbitrary string.  When possible it should match FinishState (But not required) </summary>
            std::string failureText;
            TestFinishState finishState;

            void ToJson(Json::Value& json);
    };

    /// <summary>
    /// Data container defining the test-suite data saved to JUnit XML format
    /// </summary>
    class TestSuiteReport
    {
        public:
            std::string name = "default"; // suite class name
            int tests; // total test count
            int failures; // count tests in state
            int errors; // count tests in state
            int skipped; // count tests in state
            double time; // Duration in seconds
            TimePoint timeStamp;
            // Useful for debugging but not part of the serialized format
            int passed; // Could be calculated from the others, but sometimes knowing if they don't add up means something
            std::list<std::shared_ptr<TestCaseReport*>> testResults;

            void ToJson(Json::Value& json);
    };

    class TestReport
    {
        public:
            TestSuiteReport internalReport;

            TestReport(std::string testName);

            void TestStarted();

            void TestComplete(std::string testName, TestFinishState testFinishState, TimeValueMs testDurationMs, std::string message);

            bool AllTestsPassed();
    };
}