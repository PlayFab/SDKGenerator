// Copyright (C) Microsoft Corporation. All rights reserved.

#pragma once

#include <mutex>
#include <fstream>

#include <playfab/PlayFabGameServerUtils.h>

namespace PlayFab
{
    namespace GSDK
    {
        class GSDKLogMethod
        {
        public:
            GSDKLogMethod(const char *methodName);
            ~GSDKLogMethod();

            void setExceptionInformation(const std::exception &ex);
            HRESULT setHResult(HRESULT hr);

        private:
            std::string m_methodName;
            std::string m_exception_message;
            HRESULT m_hr;
        };
    }
}