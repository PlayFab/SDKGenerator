// Copyright (C) Microsoft Corporation. All rights reserved.

#include <cstdio>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabSettings.h>

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab call Failed: " + error.GenerateErrorReport() + "\n").c_str());
}

void OnProfile(const PlayFab::ClientModels::GetPlayerProfileResult& result, void*)
{
    printf(("========== PlayFab Profile Success: " + result.PlayerProfile->DisplayName + "\n").c_str());
}

void OnLoginSuccess(const PlayFab::ClientModels::LoginResult& result, void*)
{
    printf(("========== PlayFab Login Success: " + result.PlayFabId + "\n").c_str());

    printf("========== Starting PlayFab GetProfile API call.\n");
    PlayFab::ClientModels::GetPlayerProfileRequest request;
    PlayFab::PlayFabClientAPI::GetPlayerProfile(request, OnProfile, OnPlayFabFail);
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
    PlayFab::PlayFabClientAPI::LoginWithCustomID(request, OnLoginSuccess, OnPlayFabFail);

    printf("Press enter to exit the program.\n");
    getchar();

    return 0;
}
