#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#ifdef PLAYFAB_PLATFORM_XBOX
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#endif // PLAYFAB_PLATFORM_XBOX

#ifdef PLAYFAB_PLATFORM_LINUX
#include <curl/curl.h>
#include <playfab/PlayFabHttp.h>
#endif // PLAYFAB_PLATFORM_LINUX

#ifdef PLAYFAB_PLATFORM_WINDOWS
#include <curl/curl.h>
#include <playfab/PlayFabHttp.h>
#endif // PLAYFAB_PLATFORM_WINDOWS