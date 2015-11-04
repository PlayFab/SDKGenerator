// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#include "PlayFabPrivatePCH.h"
#include "PlayFabRuntimeSettings.h"

//////////////////////////////////////////////////////////////////////////
// UPlayFabRuntimeSettings

UPlayFabRuntimeSettings::UPlayFabRuntimeSettings(const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
	, bUseDevelopmentEnvironment(false)
	, DevelopmentEnvironmentURL(TEXT(".playfabsandbox.com"))
	, ProductionEnvironmentURL(TEXT(".playfabapi.com"))
	, TitleId()
	, DeveloperSecretKey()
{
}
