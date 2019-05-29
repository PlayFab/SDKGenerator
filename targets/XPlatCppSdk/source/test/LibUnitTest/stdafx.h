#pragma once

#include <string>

inline std::wstring U(std::string input)
{
    return std::wstring(input.begin(), input.end());
}
