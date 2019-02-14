#pragma once

// Headers for CppUnitTest
#include <CppUnitTest.h>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#endif

inline std::wstring U(std::string input)
{
    return std::wstring(input.begin(), input.end());
}
