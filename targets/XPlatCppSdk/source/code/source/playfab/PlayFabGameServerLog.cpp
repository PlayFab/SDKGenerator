// Copyright (C) Microsoft Corporation. All rights reserved.

#include <stdafx.h>
#include <playfab/PlayFabGameServerLog.h>
#include <playfab/PlayFabGameServerSDK.h>

namespace PlayFab
{
    namespace GSDK
    {
        GSDKLogMethod::GSDKLogMethod(const char *methodName)
        {
            m_hr = S_OK;
            m_methodName = methodName;
            PlayFabGameServerSDK::logMessage(" - GSDKMethodEntry: " + m_methodName);
        }

        GSDKLogMethod::~GSDKLogMethod()
        {
            std::string msg = " - GSDKMethodEntry: " + m_methodName + " Result: " + std::to_string(m_hr);
            if (!m_exception_message.empty())
                msg += " Exception: " + m_exception_message;
            PlayFabGameServerSDK::logMessage(msg);
        }

        void GSDKLogMethod::setExceptionInformation(const std::exception &ex)
        {
            m_exception_message = ex.what();
        }

        HRESULT GSDKLogMethod::setHResult(HRESULT hr)
        {
            m_hr = hr;
            return hr;
        }
    }
}