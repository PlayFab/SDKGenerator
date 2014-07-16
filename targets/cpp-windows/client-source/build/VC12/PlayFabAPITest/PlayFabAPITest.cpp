// PlayFabClientAPITest.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include <cstdio>

#include "playfab/PlayFabClientAPI.h"

using namespace PlayFab;

static bool gRunning = true;

void GlobalErrorHandler(PlayFabError& error, void* userData);

void OnLogin(LoginResult& result, void* userData);
void OnLoginError(PlayFabError& error, void* userData);

int _tmain(int argc, _TCHAR* argv[])
{
    PlayFabSettings::useDevelopmentEnvironment = true;
    PlayFabSettings::developmentEnvironmentURL = "http://localhost:60474";
    PlayFabSettings::titleId = "AAA";
    PlayFabSettings::globalErrorHandler = GlobalErrorHandler;

    PlayFabClientAPI client;

    LoginWithPlayFabRequest request;
    request.Username = "rejemy";
    request.Password = "dumbweb";
    
    client.LoginWithPlayFab(request, OnLogin, OnLoginError);
    
    do 
    {
        client.Update();
    } while (gRunning);

	return 0;
}

void GlobalErrorHandler(PlayFabError& error, void* userData)
{
    printf("Got a global error\n");
}

void OnLogin(LoginResult& result, void* userData)
{
    printf("Got successful login\n");
    gRunning = false;
}

void OnLoginError(PlayFabError& error, void* userData)
{
    printf("Got error on login\n");
    gRunning = false;
}