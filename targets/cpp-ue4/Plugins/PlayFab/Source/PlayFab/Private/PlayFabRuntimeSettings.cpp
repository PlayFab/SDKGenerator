// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#include "PlayFabRuntimeSettings.h"

//////////////////////////////////////////////////////////////////////////
// UPlayFabRuntimeSettings

UPlayFabRuntimeSettings::UPlayFabRuntimeSettings()
	: bUseDevelopmentEnvironment(false)
	, DevelopmentEnvironmentURL(TEXT(".playfabsandbox.com"))
	, ProductionEnvironmentURL(TEXT(".playfabapi.com"))
	, TitleId()
	, DeveloperSecretKey()
{
}
