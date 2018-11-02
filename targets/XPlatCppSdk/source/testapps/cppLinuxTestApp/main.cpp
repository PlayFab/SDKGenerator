// Copyright (C) Microsoft Corporation. All rights reserved.

#include <cstdio>
#include <memory>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabSettings.h>

 #include <playfab/QoS/PlayFabQoSApi.h>

using namespace std;

static bool loginCompleted;

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab call Failed: " + error.GenerateErrorReport() + "\n").c_str());
}

void OnProfile(const PlayFab::ClientModels::GetPlayerProfileResult& result, void*)
{
    printf(("========== PlayFab Profile Success: " + result.PlayerProfile->PlayerId + "\n").c_str());
}

void OnLoginSuccess(const PlayFab::ClientModels::LoginResult& result, void*)
{
    printf(("========== PlayFab Login Success: " + result.PlayFabId + "\n").c_str());

    printf("========== Starting PlayFab GetProfile API call.\n");
    PlayFab::ClientModels::GetPlayerProfileRequest request;
    PlayFab::PlayFabClientAPI::GetPlayerProfile(request, OnProfile, OnPlayFabFail);
    loginCompleted = true;
}

void OnLoginFailed(const PlayFab::PlayFabError& error, void* customData)
{
    OnPlayFabFail(error, customData);
    loginCompleted = true;
}

void PrintResult(const PlayFab::QoS::DataCenterResult& result)
{
    cout << "DataCenter : " << result.dataCenterName
        << "\tLatency : " << result.latencyMs
        << "\tErrorCode :  " << result.lastErrorCode
        << endl;
}

void TestGetQosResultApi()
{
    char c = 'a';
    PlayFab::QoS::PlayFabQoSApi api;

    while (c != 'e')
    {
        auto result = api.GetQoSResult(5, 200);

        if (result.lastErrorCode == 0)
        {
            vector<PlayFab::QoS::DataCenterResult> r(move(result.dataCenterResults));

            for (int i = 0; i<r.size(); ++i)
            {
                PrintResult(r[i]);
            }
        }
        else
        {
            cout << "Result could not be populated : " << result.lastErrorCode << endl;
        }

        cout << "[QOS API] To exit, enter E, else enter anything else : " << endl;
        cin >> c;
    }
}

int main()
{
    // Super hacky short-term functionality PlayFab Test - TODO: Put the regular set of tests into proper Unit Test project
    printf("========== Starting PlayFab Login API call.\n");
    PlayFab::PlayFabSettings::titleId = "6195";
    PlayFab::PlayFabSettings::threadedCallbacks = true;
    PlayFab::ClientModels::LoginWithCustomIDRequest request;
    request.CustomId = "test_GSDK";
    request.CreateAccount = true;
    PlayFab::PlayFabClientAPI::LoginWithCustomID(request, OnLoginSuccess, OnLoginFailed);

    while (!loginCompleted);

    TestGetQosResultApi();

    return 0;
}
