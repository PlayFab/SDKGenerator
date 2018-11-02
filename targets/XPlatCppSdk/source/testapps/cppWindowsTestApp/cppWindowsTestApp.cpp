
// Copyright (C) Microsoft Corporation. All rights reserved.

#include <cppWindowsTestAppPch.h>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabAuthenticationApi.h>
#include <playfab/PlayFabAuthenticationDataModels.h>
#include <playfab/PlayFabProfilesApi.h>
#include <playfab/PlayFabProfilesDataModels.h>
#include <playfab/PlayFabSettings.h>

#include <playfab/QoS/PlayFabQoSApi.h>
#include <iostream>

static std::string _id;
static std::string _entityType;
static bool loginCompleted;

using namespace PlayFab::QoS;
using namespace std;

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab call Failed: " + error.GenerateErrorReport() + "\n").c_str());
}

void OnGetProfile(const PlayFab::ProfilesModels::GetEntityProfileResponse& result, void*)
{
    printf(("========== PlayFab Profiles Success: " + result.Profile->Entity->Type + "\n").c_str());
}

void OnGetEntityToken(const PlayFab::AuthenticationModels::GetEntityTokenResponse& result, void*)
{
    printf(("========== PlayFab GetEntityToken Success: " + result.EntityToken + "\n").c_str());
    _id = result.Entity->Id;
    _entityType = result.Entity->Type;


    auto req = PlayFab::ProfilesModels::GetEntityProfileRequest();
    req.Entity.Id = _id;
    req.Entity.Type = _entityType;

    PlayFab::PlayFabProfilesAPI::GetProfile(req, OnGetProfile, OnPlayFabFail);
}

void OnProfile(const PlayFab::ClientModels::GetPlayerProfileResult& result, void*)
{
    printf(("========== PlayFab Profile Success: " + result.PlayerProfile->DisplayName + "\n").c_str());

    auto request = PlayFab::AuthenticationModels::GetEntityTokenRequest();

    PlayFab::PlayFabAuthenticationAPI::GetEntityToken(request, OnGetEntityToken);
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

    while (!loginCompleted)
    {
        Sleep(10);
    }

    TestGetQosResultApi();

    return 0;
}