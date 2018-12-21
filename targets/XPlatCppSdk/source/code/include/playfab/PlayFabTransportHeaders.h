#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#ifdef PLAYFAB_PLATFORM_XBOX
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#endif // PLAYFAB_PLATFORM_XBOX

#if define(PLAYFAB_PLATFORM_WINDOWS) || define(PLAYFAB_PLATFORM_LINUX) 
#include <curl/curl.h>
#include <playfab/PlayFabHttp.h>
#endif // PLAYFAB_PLATFORM_WINDOWS || PLAYFAB_PLATFORM_LINUX