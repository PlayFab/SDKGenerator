// Copyright (C) Microsoft Corporation. All rights reserved.

#include <jni.h>
#include <android/log.h>
#include <string>
#include <fstream>

#include "TestAppPch.h"
#include "TestApp.h"

//#define USE_EXTERNAL_JSON_FILE

#ifdef USE_EXTERNAL_JSON_FILE
#warning "Replace below file name(except ext) with yours, and DO NOT SHARE IT."
static const char* c_jsonFileName = "YOUR_JSON_FILE_NAME";
#else // USE_EXTERNAL_JSON_FILE
#warning "Replace below information with yours, and DO NOT SHARE IT."
static const char* c_titleId = "YOUR_TITLE_ID";
static const char* c_developerSecretKey = "YOUR_DEVELOPER_SECRET_KEY";
static const char* c_userEmail = "YOUR_EMAIL";
#endif // USE_EXTERNAL_JSON_FILE

static JNIEnv* s_jniEnv = nullptr;
static jobject s_jobject = nullptr;

namespace PlayFabUnit
{
    bool TestApp::LoadTitleDataJson(std::shared_ptr<char*>& testDataJson, size_t& testDataJsonLen)
    {
#ifdef USE_EXTERNAL_JSON_FILE
        // TODO: MSFT 21256721: Need to implement to load test file from asset file.
#else // USE_EXTERNAL_JSON_FILE
        static const char* jsonTestTitleData = "{\n"
            "    \"titleId\": \"%s\",\n"
            "    \"developerSecretKey\": \"%s\",\n"
            "    \"userEmail\": \"%s\"\n"
        "}";
        testDataJson = std::make_shared<char*>(new char[1024]);
        snprintf(*testDataJson, 1024, jsonTestTitleData, c_titleId, c_developerSecretKey, c_userEmail);
        testDataJsonLen = strlen(*testDataJson);
#endif // USE_EXTERNAL_JSON_FILE
        return true;
    }

    void TestApp::LogPut(const char* message)
    {
        // Write to Android Log.
        __android_log_print(ANDROID_LOG_INFO, "XPlatCppSdk", "%s", message);

        // Write to UI log list.
        // Call updateText
        {
            jclass cls = s_jniEnv->GetObjectClass(s_jobject);
            if(cls)
            {
                jmethodID methodId = s_jniEnv->GetMethodID(cls, "updateText", "(Ljava/lang/String;)V");
                if (methodId)
                {
                    jstring urlJstr = s_jniEnv->NewStringUTF(message);
                    if (urlJstr)
                    {
                        s_jniEnv->CallVoidMethod(s_jobject, methodId, urlJstr);
                    }
                    s_jniEnv->DeleteLocalRef(urlJstr);
                }
            }
        }
    }
}

extern "C" JNIEXPORT jint JNICALL
Java_com_microsoft_xplatcppsdk_unittest_MainActivity_RunUnitTest(
        JNIEnv* env,
        jobject jobj)
{
    s_jniEnv = env;
    s_jobject = jobj;

    PlayFabUnit::TestApp testApp;

    int result = testApp.Main();
    return (jint)result;
}
