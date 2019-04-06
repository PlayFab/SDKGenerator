# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

include_directories(
        ../../../code
        ../../../code/include
        ../../../external/jsoncpp/include
        ../../../external/aria/lib/include/public
        ../../../external/aria/lib
        ../../../external/aria/bondlite/include/bond_lite
        ../../../external/aria/bondlite/generated
)

# Creates and names a library, sets it as either STATIC
# or SHARED, and provides the relative paths to its source code.
# You can define multiple libraries, and CMake builds them for you.
# Gradle automatically packages shared libraries with your APK.

add_library( # Sets the name of the library.
             XPlatCppSdk

             # Sets the library as a static library.
             SHARED

             # Provides a relative path to your source file(s).
             ../../../code/stdafx.cpp
             ../../../code/source/playfab/OneDSEventPipeline.cpp
             ../../../code/source/playfab/OneDSEventsApi.cpp
             ../../../code/source/playfab/PlayFabAdminApi.cpp
             ../../../code/source/playfab/PlayFabAdminInstanceApi.cpp
             ../../../code/source/playfab/PlayFabApiSettings.cpp
             ../../../code/source/playfab/PlayFabAuthenticationApi.cpp
             ../../../code/source/playfab/PlayFabAuthenticationContext.cpp
             ../../../code/source/playfab/PlayFabAuthenticationInstanceApi.cpp
             ../../../code/source/playfab/PlayFabCallRequestContainer.cpp
             ../../../code/source/playfab/PlayFabCallRequestContainerBase.cpp
             ../../../code/source/playfab/PlayFabClientApi.cpp
             ../../../code/source/playfab/PlayFabClientInstanceApi.cpp
             ../../../code/source/playfab/PlayFabCloudScriptApi.cpp
             ../../../code/source/playfab/PlayFabCloudScriptInstanceApi.cpp
             ../../../code/source/playfab/PlayFabDataApi.cpp
             ../../../code/source/playfab/PlayFabDataInstanceApi.cpp
             ../../../code/source/playfab/PlayFabError.cpp
             ../../../code/source/playfab/PlayFabEvent.cpp
             ../../../code/source/playfab/PlayFabEventApi.cpp
             ../../../code/source/playfab/PlayFabEventBuffer.cpp
             ../../../code/source/playfab/PlayFabEventPipeline.cpp
             ../../../code/source/playfab/PlayFabEventRouter.cpp
             ../../../code/source/playfab/PlayFabEventsApi.cpp
             ../../../code/source/playfab/PlayFabEventsInstanceApi.cpp
             ../../../code/source/playfab/PlayFabGroupsApi.cpp
             ../../../code/source/playfab/PlayFabGroupsInstanceApi.cpp
             ../../../code/source/playfab/PlayFabLocalizationApi.cpp
             ../../../code/source/playfab/PlayFabLocalizationInstanceApi.cpp
             ../../../code/source/playfab/PlayFabMatchmakerApi.cpp
             ../../../code/source/playfab/PlayFabMatchmakerInstanceApi.cpp
             ../../../code/source/playfab/PlayFabMultiplayerApi.cpp
             ../../../code/source/playfab/PlayFabMultiplayerInstanceApi.cpp
             ../../../code/source/playfab/PlayFabPluginManager.cpp
             ../../../code/source/playfab/PlayFabProfilesApi.cpp
             ../../../code/source/playfab/PlayFabProfilesInstanceApi.cpp
             ../../../code/source/playfab/PlayFabServerApi.cpp
             ../../../code/source/playfab/PlayFabServerInstanceApi.cpp
             ../../../code/source/playfab/PlayFabSettings.cpp
             ../../../code/source/playfab/PlayFabSpinLock.cpp
             ../../../code/source/playfab/PlayFabAndroidHttpPlugin.cpp
             ../../../code/source/playfab/OneDSAndroidHttpPlugin.cpp
             ../../../code/source/playfab/QoS/DataCenterResult.cpp
             ../../../code/source/playfab/QoS/PlayFabQoSApi.cpp
             ../../../code/source/playfab/QoS/QoSSocket.cpp
             ../../../code/source/playfab/QoS/XPlatSocket.cpp
             ../../../external/jsoncpp/src/lib_json/json_reader.cpp
             ../../../external/jsoncpp/src/lib_json/json_writer.cpp
             ../../../external/jsoncpp/src/lib_json/json_value.cpp
        )

set_target_properties(XPlatCppSdk
        PROPERTIES COMPILE_FLAGS "-DENABLE_PLAYFABADMIN_API \
                                  -DENABLE_PLAYFABSERVER_API"
        )

# Searches for a specified prebuilt library and stores the path as a
# variable. Because CMake includes system libraries in the search path by
# default, you only need to specify the name of the public NDK library
# you want to add. CMake verifies that the library exists before
# completing its build.

find_library( # Sets the name of the path variable.
        log-lib

        # Specifies the name of the NDK library that
        # you want CMake to locate.
        log )

# can link multiple libraries, such as libraries you define in this
# build script, prebuilt third-party libraries, or system libraries.

target_link_libraries( # Specifies the target library.
                       XPlatCppSdk

                       # Links the target library to the log library
                       # included in the NDK.
                       ${log-lib} )