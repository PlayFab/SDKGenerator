# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

# XPlatCppSdk
add_subdirectory(../XPlatCppSdk ./build)

include_directories(
        ../../../test/TestApp
        ../../../code/include
        ../../../external/jsoncpp/include
)

# Creates and names a library, sets it as either STATIC
# or SHARED, and provides the relative paths to its source code.
# You can define multiple libraries, and CMake builds them for you.
# Gradle automatically packages shared libraries with your APK.

add_library( # Sets the name of the library.
             UnitTest

             # Sets the library as a static library.
             SHARED

             # Provides a relative path to your source file(s).
             ../../../test/TestApp/PlayFabApiTest.cpp
             ../../../test/TestApp/PlayFabEventTest.cpp
             ../../../test/TestApp/PlayFabTestMultiUserInstance.cpp
             ../../../test/TestApp/PlayFabTestMultiUserStatic.cpp
             ../../../test/TestApp/TestApp.cpp
             ../../../test/TestApp/TestAppPch.cpp
             ../../../test/TestApp/TestContext.cpp
             ../../../test/TestApp/TestReport.cpp
             ../../../test/TestApp/TestRunner.cpp
             ../../../test/TestApp/TestUtils.cpp
             ./TestAppAndroid.cpp
        )

set_target_properties(UnitTest
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

# Specifies libraries CMake should link to your target library. You
# can link multiple libraries, such as libraries you define in this
# build script, prebuilt third-party libraries, or system libraries.

target_link_libraries( # Specifies the target library.
                       UnitTest
                       XPlatCppSdk

                       # Links the target library to the log library
                       # included in the NDK.
                       ${log-lib} )
