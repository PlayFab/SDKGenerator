LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

$(call import-add-path,$(LOCAL_PATH)/../../cocos2d)
$(call import-add-path,$(LOCAL_PATH)/../../cocos2d/external)
$(call import-add-path,$(LOCAL_PATH)/../../cocos2d/cocos)

LOCAL_MODULE := cocos2dcpp_shared

LOCAL_MODULE_FILENAME := libcocos2dcpp

LOCAL_SRC_FILES := hellocpp/main.cpp \
                   ../../Classes/AppDelegate.cpp \
                   ../../Classes/HelloWorldScene.cpp \
                   ../../Classes/core/PlayFabSettings.cpp \
                   ../../Classes/HttpRequest.cpp \
                   ../../Classes/HttpRequesterCURL.cpp \
                   ../../Classes/PlayFabAdminAPI.cpp \
                   ../../Classes/PlayFabAdminDataModels.cpp \
                   ../../Classes/PlayFabApiTest.cpp \
                   ../../Classes/PlayFabBaseModel.cpp \
                   ../../Classes/PlayFabClientAPI.cpp \
                   ../../Classes/PlayFabClientDataModels.cpp \
                   ../../Classes/PlayFabMatchmakerAPI.cpp \
                   ../../Classes/PlayFabMatchmakerDataModels.cpp \
                   ../../Classes/PlayFabResultHandler.cpp \
                   ../../Classes/PlayFabServerAPI.cpp \
                   ../../Classes/PlayFabServerDataModels.cpp \
                   ../../Classes/PlayFabVersion.cpp

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../Classes

# _COCOS_HEADER_ANDROID_BEGIN
# _COCOS_HEADER_ANDROID_END


LOCAL_STATIC_LIBRARIES := cocos2dx_static

# _COCOS_LIB_ANDROID_BEGIN
# _COCOS_LIB_ANDROID_END

include $(BUILD_SHARED_LIBRARY)

$(call import-module,.)

# _COCOS_LIB_IMPORT_ANDROID_BEGIN
# _COCOS_LIB_IMPORT_ANDROID_END
