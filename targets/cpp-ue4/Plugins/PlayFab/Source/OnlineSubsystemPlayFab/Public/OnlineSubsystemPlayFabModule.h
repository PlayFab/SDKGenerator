// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Core.h"
#include "ModuleInterface.h"

/**
* Online subsystem module class  (PlayFab Implementation)
* Code related to the loading of the PlayFab module
*/
class FOnlineSubsystemPlayFabModule : public IModuleInterface
{
private:

	/** Class responsible for creating instance(s) of the subsystem */
	class FOnlineFactoryPlayFab* PlayFabFactory;

public:

	FOnlineSubsystemPlayFabModule() :
		PlayFabFactory(NULL)
	{}

	virtual ~FOnlineSubsystemPlayFabModule() {}

	// IModuleInterface

	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
	virtual bool SupportsDynamicReloading() override
	{
		return false;
	}

	virtual bool SupportsAutomaticShutdown() override
	{
		return false;
	}
};
