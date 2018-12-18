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

#define UNREFERENCED_PARAMETER(P) (P)

#ifdef _DURANGO
#endif // _DURANGO

#ifdef __linux__
#include <stdio.h>
#endif // __linux__

// Durango is also defined as WIN32.
// Hence to specify only Windows, we have check for ! _DURANGO.
#ifdef _WIN32
#ifndef _DURANGO
#define WIN32_LEAN_AND_MEAN
#endif //! _DURANGO
#endif //_WIN32

#include <playfab/PlayFabJsonHeaders.h>