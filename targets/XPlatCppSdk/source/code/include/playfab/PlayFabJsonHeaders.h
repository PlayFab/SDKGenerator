#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#if define(PLAYFAB_PLATFORM_WINDOWS) || define(PLAYFAB_PLATFORM_XBOX)
#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>
#endif // PLAYFAB_PLATFORM_WINDOWS || PLAYFAB_PLATFORM_XBOX

#ifdef PLAYFAB_PLATFORM_LINUX
#include <jsoncpp/json/json.h>
#include <jsoncpp/json/reader.h>
#include <jsoncpp/json/value.h>
#endif // PLAYFAB_PLATFORM_LINUX