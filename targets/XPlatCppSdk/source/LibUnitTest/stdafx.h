#pragma once

// Headers for CppUnitTest
#include <CppUnitTest.h>

inline std::wstring U(std::string input)
{
    return std::wstring(input.begin(), input.end());
}
