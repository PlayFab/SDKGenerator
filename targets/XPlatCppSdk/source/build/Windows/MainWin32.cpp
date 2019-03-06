// Copyright (C) Microsoft Corporation. All rights reserved.

#include "TestAppPch.h"
#include "TestApp.h"

// Win32 Entry Point
int main()
{
    PlayFabUnit::TestApp testApp;

    int result = testApp.Main();
    return result;
}