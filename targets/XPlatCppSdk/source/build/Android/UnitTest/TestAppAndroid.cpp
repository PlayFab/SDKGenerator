// Copyright (C) Microsoft Corporation. All rights reserved.

#include <jni.h>
#include <android/log.h>
#include <string>
#include <fstream>
#include <sstream>

#include "TestAppPch.h"
#include "TestApp.h"

#ifdef USE_EXTERNAL_JSON_FILE
#warning "Replace below file name(except ext) with yours, and DO NOT SHARE IT."
static const char* c_jsonFileName = "YOUR_JSON_FILE_NAME";
#else // USE_EXTERNAL_JSON_FILE
#warning "Replace below information with yours, and DO NOT SHARE IT."
static const char* c_titleId = "YOUR_TITLE_ID"
static const char* c_developerSecretKey = "YOUR_DEVELOPER_SECRET_KEY";
static const char* c_userEmail = "YOUR_EMAIL";
#endif // USE_EXTERNAL_JSON_FILE

static JNIEnv* s_jniEnv = nullptr;
static jobject s_jobject = nullptr;
static std::string apkLoadedTitleData;

namespace PlayFabUnit
{
    std::string TestApp::LoadTitleDataJson()
    {
        if(mTestDataJson.empty() == false) {
            return mTestDataJson;
        }

        std::stringstream sstr;
        sstr << "{";
        sstr << R"(    "titleId": ")" << c_titleId << R"(",)";
        sstr << R"(    "developerSecretKey": ")" << c_developerSecretKey << R"(",)";
        sstr << R"(    "userEmail": ")" << c_userEmail << R"(")";
        sstr << "}";

        mTestDataJson = sstr.str();
        return mTestDataJson;
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

    PlayFabUnit::TestApp testApp(apkLoadedTitleData.empty() ? nullptr : apkLoadedTitleData.c_str());

    int result = testApp.Main();
    return (jint)result;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_microsoft_xplatcppsdk_unittest_MainActivity_SetTitleData(
        JNIEnv *env,
        jobject jobj,
        jstring value) {

    s_jniEnv = env;
    s_jobject = jobj;

    const char* utf_string;
    jboolean isCopy;
    utf_string = env->GetStringUTFChars(value, &isCopy);;
    apkLoadedTitleData = utf_string;
    if(isCopy) {
        env->ReleaseStringUTFChars(value, utf_string);
    }
    return 0;
}
