#pragma once

#ifdef _DURANGO
#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>
#endif // _DURANGO

#ifdef __linux__
#include <jsoncpp/json/json.h>
#include <jsoncpp/json/reader.h>
#include <jsoncpp/json/value.h>
#endif // __linux__

#ifdef _WIN32
#ifndef _DURANGO
#include <json/json.h>
#include <json/reader.h>
#include <json/value.h>
#endif // !_DURANGO
#endif // _WIN32