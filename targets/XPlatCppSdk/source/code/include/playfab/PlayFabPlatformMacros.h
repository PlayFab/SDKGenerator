// Copyright (C) Microsoft Corporation. All rights reserved.
// 
// This header file is used to define PLAYFAB_PLATFORM macros.
// Any platform supported by the XPlatCppSdk must be added and redefined here.
//
// Format used : PLAYFAB_PLATFORM_<PlatformName>
//
// In the PlayFab codebase, this newly defined macro will be used.

#pragma once

#ifdef _DURANGO
#define PLAYFAB_PLATFORM_XBOX
#endif // _DURANGO

#ifdef __linux__
#define PLAYFAB_PLATFORM_LINUX
#endif // __linux__

#ifdef __APPLE__
#define PLAYFAB_PLATFORM_IOS
#endif // __APPLE__

// Durango is also defined as _WIN32.
// Hence to specify only Windows, we have check for ! _DURANGO.
#if defined(_WIN32) && !defined(_DURANGO)
#define PLAYFAB_PLATFORM_WINDOWS
#endif //_WIN32