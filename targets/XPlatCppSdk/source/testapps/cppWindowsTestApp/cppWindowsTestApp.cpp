// Copyright (C) Microsoft Corporation. All rights reserved.

#include <cppWindowsTestAppPch.h>

#include <playfab/PlayFabClientApi.h>
#include <playfab/PlayFabClientDataModels.h>
#include <playfab/PlayFabSettings.h>
#include <playfab/PlayFabPluginManager.h>
#include <iostream>

void OnPlayFabFail(const PlayFab::PlayFabError& error, void*)
{
    //printf(("========== PlayFab call Failed: " + error.GenerateReport() + "\n").c_str());
    printf(("========== PlayFab call Failed: " + error.ErrorMessage + "\n").c_str());
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

using namespace PlayFab;
class MyCustomTransport : public IPlayFabHttpTransportPlugin
{
public:
    //virtual void AddRequest(const std::string&, const std::string&, const std::string&, const Json::Value&, RequestCompleteCallback, SharedVoidPointer, ErrorCallback, void*) override
    //{
    //    printf("hello there!");
    //}
    virtual void AddRequest(
        const std::string& /*urlPath*/,
        const std::string& /*authKey*/,
        const std::string& /*authValue*/,
        const std::string& /*requestBody*/, // dev note: Used to be Json::Value&
        std::function<void(CallRequestContainer)> /*callback*/)
    {
        printf("hello there!");
    }
};

int main()
{
    //PlayFab::IPlayFabTransportPlugin& plugin = PlayFab::PlayFabPluginManager::GetPlugin<PlayFab::IPlayFabTransportPlugin>(PlayFab::PlayFabPluginContract::PlayFab_Transport);

    //auto myTransportPlugin = std::make_unique<MyCustomTransport>();
    //PlayFab::PlayFabPluginManager::SetPlugin(myTransportPlugin, PlayFabPluginContract::PlayFab_HttpTransport);

    //// Super hacky short-term functionality PlayFab Test - TODO: Put the regular set of tests into proper Unit Test project
    //printf("========== Starting PlayFab Login API call.\n");
    //PlayFab::PlayFabSettings::titleId = "6195";
    //PlayFab::PlayFabSettings::threadedCallbacks = true;
    //PlayFab::ClientModels::LoginWithCustomIDRequest request;
    //request.CustomId = "test_GSDK";
    //request.CreateAccount = true;
    //PlayFab::PlayFabClientAPI::LoginWithCustomID(request, OnLoginSuccess, OnPlayFabFail);

    printf("Press enter to exit the program.\n");
    getchar();

    return 0;
}
