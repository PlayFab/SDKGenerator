// Copyright (C) Microsoft Corporation. All rights reserved.
// 
// This header file is used to include headers of transport plugins supported on each platform.

#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#ifdef PLAYFAB_PLATFORM_XBOX
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#include <playfab/OneDSIXHR2HttpPlugin.h>
#endif // PLAYFAB_PLATFORM_XBOX

#ifdef PLAYFAB_PLATFORM_WINDOWS
#include <playfab/PlayFabWinHttpPlugin.h>
#include <playfab/PlayFabHttp.h>
#include <playfab/OneDSWinHttpPlugin.h>
#include <playfab/OneDSHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_WINDOWS

#ifdef PLAYFAB_PLATFORM_LINUX
#include <playfab/PlayFabHttp.h>
#include <playfab/OneDSHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_LINUX