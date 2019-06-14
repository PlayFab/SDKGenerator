// Copyright (C) Microsoft Corporation. All rights reserved.

#import <UIKit/UIKit.h>

#include "TestAppPch.h"
#include <fstream>
#include "TestApp.h"
#include "log_bridge.h"
#include "TestAppIOS.h"

#define USE_EXTERNAL_JSON_FILE

#ifdef USE_EXTERNAL_JSON_FILE
#warning "Replace the contents of $WORKSPACE/TestTitleData/testTitleData.json with your title secret information!"
#else // USE_EXTERNAL_JSON_FILE
#warning "Replace below information with yours, and DO NOT SHARE IT."
static constexpr NSString* c_titleId = @"YOUR_TITLE_ID";
static constexpr NSString* c_developerSecretKey = @"YOUR_DEVELOPER_SECRET_KEY";
static constexpr NSString* c_userEmail = @"YOUR_EMAIL";
#endif // USE_EXTERNAL_JSON_FILE

namespace PlayFabUnit
{
    // Partial class implementation of TestApp.
    // Each platform gets its own file and implementation of the following methods, since the logic
    // is likely to be very different on all of them.
    bool TestApp::LoadTitleDataJson(std::shared_ptr<char*>& testDataJson, size_t& testDataJsonLen)
    {
#ifdef USE_EXTERNAL_JSON_FILE
        NSString *filePath = [[NSBundle mainBundle] pathForResource:@"testTitleData" ofType:@"json" inDirectory:@"TestTitleData"];
        if(filePath == nil)
        {
            Log("Failed to get json file path.");
            return false;
        }
        NSData *data = [NSData dataWithContentsOfFile:filePath];
        if(data == nil)
        {
            Log("Failed to load json file.");
            return false;
        }

        NSString* jsonString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        if(jsonString == nil)
        {
            Log("Failed to encode json string.");
            return false;
        }

        testDataJsonLen = [jsonString lengthOfBytesUsingEncoding:NSUTF8StringEncoding];
        testDataJson = std::make_shared<char*>(new char[testDataJsonLen + 1]);
        strlcpy(*testDataJson, [jsonString UTF8String], testDataJsonLen + 1);
#else // USE_EXTERNAL_JSON_FILE
        constexpr NSString* jsonTestTitleData = @"{\n"
            @"    \"titleId\": \"%@\",\n"
            @"    \"developerSecretKey\": \"%@\",\n"
            @"    \"userEmail\": \"%@\"\n"
        @"}";
        NSString* jsonString = [NSString stringWithFormat:jsonTestTitleData, c_titleId, c_developerSecretKey, c_userEmail];
        if(jsonString == nil)
        {
            Log("Failed to make json string.");
            return false;
        }
        testDataJsonLen = [jsonString lengthOfBytesUsingEncoding:NSUTF8StringEncoding];
        testDataJson = std::make_shared<char*>(new char[testDataJsonLen + 1]);
        strlcpy(*testDataJson, [jsonString UTF8String], testDataJsonLen + 1);
#endif // USE_EXTERNAL_JSON_FILE
        return true;
    }

    void TestApp::LogPut(const char* message)
    {
        // Write to STDOUT.
        puts(message);

        // Write to UI log list.
        OutputDebugString(message);
    }
}

int RunUnittest(void)
{
    PlayFabUnit::TestApp testApp;

    int result = testApp.Main();
    exit(result);
}
