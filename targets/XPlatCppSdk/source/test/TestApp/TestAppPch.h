// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#if defined (_XBOX_ONE)

// Use the C++ standard templated min/max
#define NOMINMAX

#include <xdk.h>
#include <wrl.h>
#include <d3d11_x.h>
#include <DirectXMath.h>
#include <DirectXColors.h>

#include <algorithm>
#include <memory>

#include <pix.h>

namespace DX
{
    inline void ThrowIfFailed(HRESULT hr)
    {
        if (FAILED(hr))
        {
            // Set a breakpoint on this line to catch DirectX API errors
            throw Platform::Exception::CreateException(hr);
        }
    }
}

#elif defined (_WIN32)
#include <SDKDDKVer.h>
#define WIN32_LEAN_AND_MEAN

#endif
