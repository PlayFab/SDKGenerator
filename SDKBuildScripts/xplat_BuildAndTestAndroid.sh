#!/bin/bash
pushd ../../sdks/$SdkName/build/Android
AndroidProjectPath=$PWD
popd

apkPath=$AndroidProjectPath/app/build/outputs/apk/debug/app-debug.apk
testAssemblyDir="$1"

Usage="./xplat_BuildAndTestAndroid.sh <path to test assemblies>"
ArgCount=$#
CheckParameters() {
    if [ $ArgCount -ne 1 ]; then
        echo "ERROR Incorrect number of parameters!"
        echo "$Usage"
        exit 1
    fi
}

ExitIfError() {
    ErrorStatus=$?
    if [ $ErrorStatus -ne 0 ]; then
        echo "Exiting with Error Code: $ErrorStatus" >&2
        exit 1
    fi
}

CopyTestTitleData() {
    cp -f "$PF_TEST_TITLE_DATA_JSON" "$AndroidProjectPath/app/src/main/assets"
    ExitIfError
}

BuildAPK() {
    pushd "$AndroidProjectPath"
    ExitIfError

    ./gradlew build
    ExitIfError

    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXPlatAndroid" \
    --devices "PlayFabSDKTeam/android-common" \
    --app-path "$apkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --build-dir "$testAssemblyDir"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"

    ExitIfError
}

DoWork() {
    CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork