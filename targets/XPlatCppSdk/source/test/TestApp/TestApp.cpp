// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <cstdarg>
#include <functional>
#include <string>
#include <thread>
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabSettings.h>
#include "TestApp.h"
#include "TestRunner.h"
#include "TestReport.h"
#include "PlayFabApiTest.h"
#include "PlayFabEventTest.h"
#include "PlayFabTestMultiUserStatic.h"
#include "PlayFabTestMultiUserInstance.h"

using namespace PlayFab;
using namespace ClientModels;

namespace PlayFabUnit
{
    int TestApp::Main()
    {
        // Load the TestTitleData
        TestTitleData testInputs;
        bool loadSuccessful = LoadTitleData(testInputs);

        // If the title data fails to load, and you want to use custom hard-coded data, you can
        // comment out the return statement and fill out the TestTitleData fields manually.
        if (!loadSuccessful)
        {
            return 1;

            // TODO: POPULATE THIS SECTION WITH REAL INFORMATION (or set up a testTitleData file, and set your PF_TEST_TITLE_DATA_JSON to the path for that file)
            //testInputs.titleId = ""; // The titleId for your title, found in the "Settings" section of PlayFab Game Manager
            //testInputs.userEmail = ""; // This is the email for a valid user (test tries to log into it with an invalid password, and verifies error result)
        }

        // Initialize the test runner/test data.
        TestRunner testRunner;

        // Add PlayFab API tests.
        PlayFabApiTest pfApiTest;
        pfApiTest.SetTitleInfo(testInputs);
        testRunner.Add(pfApiTest);

        PlayFabEventTest pfEventTest;
        testRunner.Add(pfEventTest);

        PlayFabTestMultiUserStatic pfMultiUserStaticTest;
        testRunner.Add(pfMultiUserStaticTest);

        PlayFabTestMultiUserInstance pfMultiUserInstanceTest;
        testRunner.Add(pfMultiUserInstanceTest);

        // Run the tests (blocks until all tests have finished).
        testRunner.Run();

        // Publish the test report via cloud script (and wait for it to finish).
        LoginWithCustomIDRequest request;
        request.CustomId = PlayFabSettings::buildIdentifier;
        request.CreateAccount = true;
        PlayFabClientAPI::LoginWithCustomID(request,
            std::bind(&TestApp::OnPostReportLogin, this, std::placeholders::_1, std::placeholders::_2),
            std::bind(&TestApp::OnPostReportError, this, std::placeholders::_1, std::placeholders::_2),
            &testRunner.suiteTestReport);

        while (cloudResponse.empty())
        {
            std::this_thread::sleep_for(TimeValueMs(100));
        }

        // Publish the test summary (including cloud script response) to STDOUT.
        Log("%s\n%s\n", testRunner.suiteTestSummary.c_str(), cloudResponse.c_str());

        // Return 0 (success) if all tests passed. Otherwise, return 1 (error).
        return testRunner.AllTestsPassed() ? 0 : 1;
    }

    bool TestApp::LoadTitleData(TestTitleData& titleData)
    {
        // Load JSON string in a platform-dependent way.
        std::shared_ptr<char*> titleJsonPtr;
        size_t size;
        const bool loadedSuccessfully = LoadTitleDataJson(titleJsonPtr, size);

        if (!loadedSuccessfully)
            return false;

        // Parse JSON string into output TestTitleData.
        Json::CharReaderBuilder jsonReaderFactory;
        Json::CharReader* jsonReader(jsonReaderFactory.newCharReader());
        JSONCPP_STRING jsonParseErrors;
        Json::Value titleDataJson;
        const bool parsedSuccessfully = jsonReader->parse(*titleJsonPtr, *titleJsonPtr + size + 1, &titleDataJson, &jsonParseErrors);

        if (parsedSuccessfully)
        {
            titleData.titleId = titleDataJson["titleId"].asString();
            titleData.userEmail = titleDataJson["userEmail"].asString();
            titleData.developerSecretKey = titleDataJson["developerSecretKey"].asString();
        }

        return parsedSuccessfully;
    }

    void TestApp::Log(const char* format, ...)
    {
        static char message[4096];

        va_list args;
        va_start(args, format);
#if defined(PLAYFAB_PLATFORM_IOS) || defined(PLAYFAB_PLATFORM_ANDROID)
        vsnprintf(message, sizeof(message), format, args);
#else // PLAYFAB_PLATFORM_IOS || PLAYFAB_PLATFORM_ANDROID
        _vsnprintf_s(message, sizeof(message), format, args);
#endif // PLAYFAB_PLATFORM_IOS || PLAYFAB_PLATFORM_ANDROID
        va_end(args);

        // Output the message in a platform-dependent way.
        LogPut(message);
    }

    void TestApp::OnPostReportLogin(const LoginResult& result, void* customData)
    {
        cloudPlayFabId = result.PlayFabId;

        // Prepare a JSON value as a param for the remote cloud script.
        Json::Value cloudReportJson;
        cloudReportJson["customId"] = cloudPlayFabId;

        // The expected format is a list of TestSuiteReports, but this framework only submits one
        cloudReportJson["testReport"];
        Json::Value arrayInit(Json::arrayValue);
        cloudReportJson["testReport"].swapPayload(arrayInit);

        // Encode the test report as JSON.
        TestReport* testReport = reinterpret_cast<TestReport*>(customData);
        testReport->internalReport.ToJson(cloudReportJson["testReport"][0]);

        // Save the test results via cloud script.
        ExecuteCloudScriptRequest request;
        request.FunctionName = "SaveTestData";
        request.FunctionParameter = cloudReportJson;
        request.GeneratePlayStreamEvent = true;
        PlayFabClientAPI::ExecuteCloudScript(request,
            std::bind(&TestApp::OnPostReportComplete, this, std::placeholders::_1, std::placeholders::_2),
            std::bind(&TestApp::OnPostReportError, this, std::placeholders::_1, std::placeholders::_2));
    }

    void TestApp::OnPostReportComplete(const ExecuteCloudScriptResult& result, void* /*customData*/)
    {
        if (result.Error.isNull())
            cloudResponse = "Test report submitted via cloud script: " + PlayFabSettings::buildIdentifier + ", " + cloudPlayFabId;
        else
            cloudResponse += "Error executing test report cloud script:\n" + result.Error->Error + ": " + result.Error->Message;
    }

    void TestApp::OnPostReportError(const PlayFabError& error, void* /*customData*/)
    {
        cloudResponse = "Failed to report results via cloud script: " + error.GenerateErrorReport();
    }
}
