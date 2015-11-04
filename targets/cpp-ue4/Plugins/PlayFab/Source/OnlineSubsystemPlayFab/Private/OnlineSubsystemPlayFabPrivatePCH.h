// Copyright 1998-2015 Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Engine.h"
#include "OnlineSubsystemPlayFabModule.h"
#include "OnlineSubsystemModule.h"
#include "OnlineSubsystem.h"
#include "ModuleManager.h"

/** FName declaration of Null subsystem */
#define PLAYFAB_SUBSYSTEM FName(TEXT("PlayFab"))

/** pre-pended to all PLAYFAB logging */
#undef ONLINE_LOG_PREFIX
#define ONLINE_LOG_PREFIX TEXT("PLAYFAB: ")


