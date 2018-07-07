#pragma once

// Headers for CppUnitTest
#include <CppUnitTest.h>

#define UNREFERENCED_VARIABLE(X) (void) (X);

inline std::wstring U(std::string input)
{
    return std::wstring(input.begin(), input.end());
}
