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

#ifdef LINUX_BUILD
#include <jsoncpp/json/json.h>
#include <jsoncpp/json/reader.h>
#include <jsoncpp/json/value.h>
#include <curl/curl.h>
#include <stdio.h>
#endif

#ifdef WINDOWS_BUILD
#define WIN32_LEAN_AND_MEAN

#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>
#include <curl/curl.h>
#endif
