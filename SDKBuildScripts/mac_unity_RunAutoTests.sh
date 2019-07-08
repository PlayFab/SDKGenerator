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
if [ -z "$3" ]; then
    ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
else
    ProjRootPath="$3"
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

    # TC is used by essentially all of the test projects
    . ./unity_copyTestTitleData.sh "${ProjRootPath}/${SdkName}_TC/Assets/Resources" copy || exit 1
    SetEachProjDefine ${SdkName}_TC
    # TODO: This is limiting the tests that get run on Jenkins...

    if [ "$BuildMainUnityPackage" = "true" ]; then
        SetEachProjDefine ${SdkName}_BUP
    fi

    SetEachProjDefine ${SdkName}_TA
    SetEachProjDefine ${SdkName}_TS
    SetEachProjDefine ${SdkName}_TZ
}

SetEachProjDefine() {
    echo === Set Each Proj Define ===
    pushd "${ProjRootPath}/$1"
    $UNITY191 -buildOSXUniversalPlayer "${ProjRootPath}/${SdkName}_TC/" -accept-apiupdate -disable-assembly-updater -noUpm -nographics -quit -batchmode -executeMethod SetupPlayFabExample.Setup -logFile "${ProjRootPath}/compile$1.txt" || (cat "${ProjRootPath}/compile$1.txt" && return 1)
    popd
}

JenkernaughtSaveCloudScriptResults() {
    echo === Save test results to Jenkernaught ===
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    # cmd <<< "JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath $WORKSPACE -timeout 30 -verbose true"
    . ./JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath $WORKSPACE -timeout 30 -verbose true
    popd
}

RunClientJenkernaught() {
    echo === Build OSX Client Target ===
    pushd "${ProjRootPath}/${SdkName}_TC/"
    $UNITY191 -buildOSXUniversalPlayer "${ProjRootPath}/${SdkName}_TC" -accept-apiupdate -disable-assembly-updater -noUpm -nographics -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeOsxBuild -logFile "${ProjRootPath}/buildOSXClient.txt" || (cat "${ProjRootPath}/buildOSXClient.txt" && return 1)
    popd

    echo === Run the $UNITY183 Client UnitTests ===
    pushd "${ProjRootPath}/${SdkName}_TC/testBuilds"
    ls
    popd

    JenkernaughtSaveCloudScriptResults
    if [[ $? -ne 0 ]]; then return 1; fi
}

BuildClientByFunc() {
    if [ "$1" = "true" ]; then
        echo === Build $2 Target ===
        pushd "${ProjRootPath}/${SdkName}_TC/"
        $UNITY191 -buildOSX64Player "${ProjRootPath}/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.$2 -logFile "${ProjRootPath}/${2}.txt" || (cat "${ProjRootPath}/${2}.txt" && return 1)
        popd
        #Run the console test command if present
        if [ ! -z "$3" ]; then
            $3
        fi
    fi
}

BuildMainPackage() {
    if [ "$UNITY_PUBLISH_VERSION" = "$UNITY_VERSION" ] && [ "$BuildMainUnityPackage" = "true" ]; then
        echo === Build the asset bundle ===
        cd "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP"
        $UNITY183 -projectPath "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.PackagePlayFabSdk -logFile "$WORKSPACE/${SdkName}/buildPackageOutput.txt" || (cat "$WORKSPACE/${SdkName}/buildPackageOutput.txt" && return 1)
    fi
}

#pretty-print test a  test result codes (if the test was actually run)
EM() {
    if [ "$2" != "true" ]; then echo "N/A"
    elif [ $1 -ne 0 ]; then echo FAIL
    else echo PASS
    fi
}

#boil error codes down to either 1 or 0.
EC() {
    if [ $1 -ne 0 ]; then return 1; else return 0; fi
}

DoWork() {
    CheckVars
    SetProjDefines
    RunClientJenkernaught
    BuildMainPackage
}

DoWork