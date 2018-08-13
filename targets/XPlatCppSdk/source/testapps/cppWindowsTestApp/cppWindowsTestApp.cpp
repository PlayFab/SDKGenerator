
// Copyright (C) Microsoft Corporation. All rights reserved.

#include <cppWindowsTestAppPch.h>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabAuthenticationApi.h>
#include <playfab/PlayFabAuthenticationDataModels.h>
#include <playfab/PlayFabProfilesApi.h>
#include <playfab/PlayFabProfilesDataModels.h>
#include <playfab/PlayFabSettings.h>


static std::string _id;
static std::string _type;

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    printf(("========== PlayFab call Failed: " + error.GenerateErrorReport() + "\n").c_str());
}

void OnGetProfile(const PlayFab::ProfilesModels::GetEntityProfileResponse& result, void*)
{
    printf(("========== PlayFab Profiles Success: " + result.Profile.mValue.Entity.mValue.Type + "\n").c_str());
}

void OnGetEntityToken(const PlayFab::AuthenticationModels::GetEntityTokenResponse& result, void*)
{
    printf(("========== PlayFab GetEntityToken Success: " + result.EntityToken + "\n").c_str());
    _id = result.Entity.mValue.Id;
    _type = result.Entity.mValue.Type;


    auto req = PlayFab::ProfilesModels::GetEntityProfileRequest();
    req.Entity.Id = _id;
    req.Entity.Type = _type;

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
