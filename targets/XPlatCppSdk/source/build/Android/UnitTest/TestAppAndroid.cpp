// Copyright (C) Microsoft Corporation. All rights reserved.

#include <jni.h>
#include <android/log.h>
#include <string>
#include <fstream>
#include <sstream>
#include <memory>

#include "TestAppPch.h"
#include "TestApp.h"

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
static std::string cachedTitleData;

namespace PlayFabUnit
{
    bool allocCharBufferFromString(const std::string& str, std::shared_ptr<char*>& strPtr, size_t& strLen) {
        if(str.empty()) {
            return false;
        }

        strPtr = std::make_shared<char*>(new char[str.size() + 1]);
        str.copy(*strPtr, str.size());
        (*strPtr)[str.size()] = '\0';
        strLen = str.size();

        return true;
    }

    bool TestApp::LoadTitleDataJson(std::shared_ptr<char*>& testDataJsonPtr, size_t& testDataJsonLen)
    {
        if(cachedTitleData.empty() == false) {
            return allocCharBufferFromString(cachedTitleData, testDataJsonPtr, testDataJsonLen);
        }

        std::stringstream jsonBuilder;
        jsonBuilder << "{";
        jsonBuilder << R"(    "titleId": ")" << c_titleId << R"(",)";
        jsonBuilder << R"(    "developerSecretKey": ")" << c_developerSecretKey << R"(",)";
        jsonBuilder << R"(    "userEmail": ")" << c_userEmail << R"(")";
        jsonBuilder << "}";

        cachedTitleData = jsonBuilder.str();

        return allocCharBufferFromString(cachedTitleData, testDataJsonPtr, testDataJsonLen);
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
Java_com_playfab_service_MainActivity_RunUnitTest(
        JNIEnv* env,
        jobject jobj)
{
    s_jniEnv = env;
    s_jobject = jobj;

    PlayFabUnit::TestApp testApp;

    int result = testApp.Main();
    return (jint)result;
}

extern "C" JNIEXPORT jint JNICALL
Java_com_playfab_service_MainActivity_SetTitleData(
        JNIEnv *env,
        jobject jobj,
        jstring value) {

    s_jniEnv = env;
    s_jobject = jobj;

    const char* utf_string;
    jboolean isCopy;
    utf_string = env->GetStringUTFChars(value, &isCopy);;
    cachedTitleData = utf_string;
    if(isCopy) {
        env->ReleaseStringUTFChars(value, utf_string);
    }
    return 0;
}
