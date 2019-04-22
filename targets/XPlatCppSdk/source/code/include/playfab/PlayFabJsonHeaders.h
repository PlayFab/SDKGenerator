// Copyright (C) Microsoft Corporation. All rights reserved.
//
// This header file is used to include platform-specific headers of JsonCpp library.

#pragma once

#include <playfab/PlayFabPlatformMacros.h>

#if defined(PLAYFAB_PLATFORM_WINDOWS) || defined(PLAYFAB_PLATFORM_XBOX) || defined(PLAYFAB_PLATFORM_IOS) || defined(PLAYFAB_PLATFORM_ANDROID)
#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>
#endif // PLAYFAB_PLATFORM_WINDOWS || PLAYFAB_PLATFORM_XBOX || PLAYFAB_PLATFORM_IOS || PLAYFAB_PLATFORM_ANDROID

#ifdef PLAYFAB_PLATFORM_LINUX
#include <jsoncpp/json/json.h>
#include <jsoncpp/json/reader.h>
#include <jsoncpp/json/value.h>
#endif // PLAYFAB_PLATFORM_LINUX