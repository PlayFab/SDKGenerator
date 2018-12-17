#pragma once

#ifdef _DURANGO
#include <playfab/PlayFabIXHR2HttpPlugin.h>
#endif // _DURANGO

#ifdef __linux__
#include <curl/curl.h>
#include <playfab/PlayFabHttp.h>
#endif // __linux__

#ifdef _WIN32
#ifndef _DURANGO
#include <curl/curl.h>
#include <playfab/PlayFabHttp.h>
#endif // !_DURANGO
#endif // _WIN32