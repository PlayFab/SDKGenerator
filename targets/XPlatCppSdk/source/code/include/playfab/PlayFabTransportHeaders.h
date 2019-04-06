// Copyright (C) Microsoft Corporation. All rights reserved.
// 
// This header file is used to include headers of transport plugins supported on each platform.

#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#ifdef PLAYFAB_PLATFORM_XBOX
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#include <playfab/OneDSIXHR2Plugin.h>
#endif // PLAYFAB_PLATFORM_XBOX

#ifdef PLAYFAB_PLATFORM_WINDOWS
#include <playfab/PlayFabWinHttpPlugin.h>
#include <playfab/OneDSWinHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_WINDOWS

#ifdef PLAYFAB_PLATFORM_LINUX
#include <playfab/PlayFabCurlHttpPlugin.h>
#include <playfab/OneDSCurlHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_LINUX

#ifdef PLAYFAB_PLATFORM_IOS
#include <playfab/PlayFabIOSHttpPlugin.h>
#include <playfab/OneDSIOSHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_IOS

#ifdef PLAYFAB_PLATFORM_ANDROID
#include <playfab/PlayFabAndroidHttpPlugin.h>
#include <playfab/OneDSAndroidHttpPlugin.h>
#endif // PLAYFAB_PLATFORM_ANDROID
