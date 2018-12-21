// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <list>
#include <unordered_map>
#include <map>
#include <algorithm>
#include <functional>
#include <string>
#include <cstring>
#include <future>

#include <iomanip>
#include <iostream>
#include <sstream>
#include <fstream>

#include <chrono>
#include <mutex>
#include <condition_variable>
#include <thread>

#include <playfab/PlayFabPlatformMacros.h>

#define UNREFERENCED_PARAMETER(P) (P)

#ifdef PLAYFAB_PLATFORM_LINUX
#include <stdio.h>
#endif // PLAYFAB_PLATFORM_LINUX

#ifdef PLAYFAB_PLATFORM_WINDOWS
#define WIN32_LEAN_AND_MEAN
#endif // PLAYFAB_PLATFORM_WINDOWS

#include <playfab/PlayFabJsonHeaders.h>