// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "PlayFabRuntimeSettings.generated.h"

/**
* Implements the settings for the PlayFab plugin.
*/
UCLASS(config = Engine, defaultconfig)
class PLAYFAB_API UPlayFabRuntimeSettings : public UObject
{
	GENERATED_UCLASS_BODY()

	// Define if we want to use the sandbox URL
	UPROPERTY(EditAnywhere, config, Category = Settings)
	bool bUseDevelopmentEnvironment;

	// URL endpoint of the PlayFab sandbox
	UPROPERTY(EditAnywhere, config, Category = Settings)
	FString DevelopmentEnvironmentURL;

	// URL endpoint of the PlayFab production environment 
	UPROPERTY(EditAnywhere, config, Category = Settings)
	FString ProductionEnvironmentURL;

	// Game Title ID 
	UPROPERTY(EditAnywhere, config, Category = Settings)
	FString TitleId;

	// Secret Key, Do not add this to the clients!
	UPROPERTY(EditAnywhere, config, Category = Settings)
	FString DeveloperSecretKey;
};
