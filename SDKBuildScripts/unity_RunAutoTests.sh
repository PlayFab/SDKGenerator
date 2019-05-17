#!/bin/bash

# USAGE: unity_RunAutoTests.bat [<UNITY_VERSION>] [<SdkName>] [<ProjRootPath>] [<BuildIdentifier>]
# Make folder links from the UnitySdk to this test project
# Requires mklink which may require administrator
# Requires the following environment variables:
#   TestWin32Build - (Optional - Default false if unset) set to "true" to test building Win32, executing, and geting Jenker! results
#   TestAndroid - (Optional - Default false if unset) set to "true" to build Android APK
#   TestiPhone - (Optional - Default false if unset) set to "true" to build iOS XCode project
#   TestWp8 - (Optional - Default false if unset) set to "true" to build Windows Universal 8 vs-sln
#   TestPS4 - (Optional - Default false if unset) set to "true" to build Sony PS4
#   TestSwitch - (Optional - Default false if unset) set to "true" to build Nintendo Switch
#   TestXbox - (Optional - Default false if unset) set to "true" to build Xbox One
#   BuildMainUnityPackage - (Optional - Default false if unset) set to "true" to build Unity Package for the SDK
#   UNITY_PUBLISH_VERSION - (Not required if $1 is defined) Versioned Unity executable name (Assumes multiple potential Unity installations, all in your PATH, each uniquely renamed)
#   EXECUTOR_NUMBER - (Not required if $4 is defined) Automatic Jenkins variable


if [ -z $1 ]; then
    UNITY_VERSION=$UNITY_PUBLISH_VERSION
else
    UNITY_VERSION=$1
fi
if [ -z $2 ]; then
    SdkName=UnitySDK
else
    SdkName=$2
fi
if [ -z $3 ]; then
    ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
else
    ProjRootPath=$3
fi
if [ -z $4 ]; then
    BuildIdentifier=JBuild_${SdkName}_${EXECUTOR_NUMBER}
else
    BuildIdentifier=$4
fi

CheckVars() {
    if [ -z "$TestWin32Build" ]; then
        TestWin32Build="false"
    fi
    if [ -z "$TestAndroid" ]; then
        TestAndroid="false"
    fi
    if [ -z "$TestiPhone" ]; then
        TestiPhone="false"
    fi
    if [ -z "$TestWp8" ]; then
        TestWp8="false"
    fi
    if [ -z "$TestPS4" ]; then
        TestPS4="false"
    fi
    if [ -z "$TestSwitch" ]; then
        TestSwitch="false"
    fi
    if [ -z "$TestXbox" ]; then
        TestXbox="false"
    fi
    if [ -z "$BuildMainUnityPackage" ]; then
        BuildMainUnityPackage="false"
    fi
}

SetProjDefines() {
    echo === Test compilation in all example projects ===
    SetEachProjDefine ${SdkName}_BUP
    # SetEachProjDefine ${SdkName}_TA
    SetEachProjDefine ${SdkName}_TC
    # SetEachProjDefine ${SdkName}_TS
    # SetEachProjDefine ${SdkName}_TZ
}

SetEachProjDefine() {
    pushd "${ProjRootPath}/$1"
    $UNITY_VERSION -projectPath "${ProjRootPath}/$1" -quit -batchmode -executeMethod SetupPlayFabExample.Setup -logFile "${ProjRootPath}/compile$1.txt" || (cat "${ProjRootPath}/compile$1.txt" && return 1)
    popd
}

RunClientJenkernaught() {
    if [ "$TestWin32Build" = "true" ]; then
        echo === Build Win32 Client Target ===
        pushd "${ProjRootPath}/${SdkName}_TC"
        $UNITY_VERSION -projectPath "${ProjRootPath}/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeWin32TestingBuild -logFile "${ProjRootPath}/buildWin32Client.txt" || (cat "${ProjRootPath}/buildWin32Client.txt" && return 1)
        popd

        echo === Run the $UNITY_VERSION Client UnitTests ===
        pushd "${ProjRootPath}/${SdkName}_TC/testBuilds"
        ls
        cmd <<< "Win32test.exe -batchmode -nographics -logFile \"${ProjRootPath}/clientTestOutput.txt" || (cat "${ProjRootPath}/clientTestOutput.txt" && return 1)
        popd

        echo === Save test results to Jenkernaught ===
        pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
        cmd <<< "JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath $WORKSPACE -timeout 30 -verbose true"
        popd
    fi
}

BuildClientByFunc() {
    if [ "$1" = "true" ]; then
        echo === Build $2 Target ===
        pushd "${ProjRootPath}/${SdkName}_TC"
        $UNITY_VERSION -projectPath "${ProjRootPath}/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.$2 -logFile "${ProjRootPath}/${1}.txt" || (cat "${ProjRootPath}/${1}.txt" && return 1)
        popd
    fi
}

BuildMainPackage() {
    if [ "$UNITY_PUBLISH_VERSION" = "$UNITY_VERSION" ] && [ "$BuildMainUnityPackage" = "true" ]; then
        echo === Build the asset bundle ===
        cd "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP"
        $UNITY_VERSION -projectPath "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.PackagePlayFabSdk -logFile "$WORKSPACE/${SdkName}/buildPackageOutput.txt" || (cat "$WORKSPACE/${SdkName}/buildPackageOutput.txt" && return 1)
    fi
}

DoWork() {
    CheckVars
    SetProjDefines
    RunClientJenkernaught
    BuildClientByFunc "$TestAndroid" "MakeAndroidBuild"
    BuildClientByFunc "$TestiPhone" "MakeIPhoneBuild"
    BuildClientByFunc "$TestWp8" "MakeWp8Build"
    BuildClientByFunc "$TestPS4" "MakePS4Build"
    BuildClientByFunc "$TestSwitch" "MakeSwitchBuild"
    BuildClientByFunc "$TestXbox" "MakeXboxOneBuild"
    BuildMainPackage
}

DoWork