// Copyright (C) Microsoft Corporation. All rights reserved.

#include <stdio.h>
#include <stdlib.h>

#include "log_bridge.h"

static struct _LogOutputCallbackInfo {
    LogOutputCallback callback;
    LogOutputContext context;
} s_callbackInfo = {};

void SetLogOutputCallback(LogOutputCallback callback, LogOutputContext context)
{
    s_callbackInfo.callback = callback;
    s_callbackInfo.context = context;
}

void ResetLogOutputCallback(void)
{
    s_callbackInfo.callback = NULL;
    s_callbackInfo.context = NULL;
}

void OutputDebugString(const char* message)
{
    if (s_callbackInfo.callback)
    {
        s_callbackInfo.callback(message, s_callbackInfo.context);
    }
}
