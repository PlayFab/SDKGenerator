// Copyright (C) Microsoft Corporation. All rights reserved.

#ifndef _LOG_BRIDGE_H_
#define _LOG_BRIDGE_H_

typedef void* LogOutputContext;

typedef void (*LogOutputCallback)(const char *message, LogOutputContext context);

#ifdef __cplusplus
extern "C"
{
#endif // __cplusplus

void SetLogOutputCallback(LogOutputCallback callback, LogOutputContext context);

void ResetLogOutputCallback(void);

void OutputDebugString(const char* message);

#ifdef __cplusplus
}
#endif // __cplusplus


#endif // _LOG_BRIDGE_H_
