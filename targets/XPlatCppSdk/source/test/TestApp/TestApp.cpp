// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include <string>
#include <thread>
#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabSettings.h>
#include "TestTitleDataLoader.h"
#include "TestRunner.h"
#include "TestReport.h"
#include "PlayFabApiTest.h"
#include "PlayFabEventTest.h"
#include "PlayFabTestMultiUserStatic.h"
#include "PlayFabTestMultiUserInstance.h"

using namespace PlayFab;
using namespace ClientModels;
using namespace PlayFabUnit;

static std::string cloudResponse = "";
static std::string cloudPlayFabId = "";
static void PostResultsToCloud(TestReport& testReport);

int main()
{
    // Load the TestTitleData
    TestTitleData testInputs;
    bool loadSuccessful = TestTitleDataLoader::Load(testInputs);

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
    PostResultsToCloud(testRunner.suiteTestReport);

    while (cloudResponse.empty())
    {
        std::this_thread::sleep_for(TimeValueMs(100));
    }

    // Publish the test summary (including cloud script response) to STDOUT.
    printf("%s\n%s\n", testRunner.suiteTestSummary.c_str(), cloudResponse.c_str());

    // Return 0 (success) if all tests passed. Otherwise, return 1 (error).
    return testRunner.AllTestsPassed() ? 0 : 1;
}

static void OnPostReportError(const PlayFabError& error, void*)
{
    cloudResponse = "Failed to report results via cloud script: " + error.GenerateErrorReport();
}

static void OnPostReportComplete(const ExecuteCloudScriptResult& result, void*)
{
    if (result.Error.isNull())
        cloudResponse = "Test report submitted via cloud script: " + PlayFabSettings::buildIdentifier + ", " + cloudPlayFabId;
    else
        cloudResponse += "Error executing test report cloud script:\n" + result.Error->Error + ": " + result.Error->Message;
}

static void OnPostReportLogin(const LoginResult& result, void* customData)
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
    PlayFabClientAPI::ExecuteCloudScript(request, OnPostReportComplete, OnPostReportError);
}

void PostResultsToCloud(TestReport& testReport)
{
    LoginWithCustomIDRequest request;
    request.CustomId = PlayFabSettings::buildIdentifier;
    request.CreateAccount = true;
    PlayFabClientAPI::LoginWithCustomID(request, OnPostReportLogin, OnPostReportError, &testReport);
}
