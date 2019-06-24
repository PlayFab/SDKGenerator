#!/bin/bash
pushd ../../sdks/XPlatCppSdk/build/Android
AndroidProjectPath=$PWD
popd

apkPath=$AndroidProjectPath/app/build/outputs/apk/debug/app-debug.apk
testAssemblyDir="$1"

Usage="./xplat_BuildAndTestAndroid.sh <path to test assemblies>"


ExitIfError() {
    ErrorStatus=$?
    if [ $ErrorStatus -ne 0 ]; then
        echo "Exiting with Error Code: $ErrorStatus" >&2
        exit 1
    fi
}

CheckParameters() {
    if [ $# -ne 1 ]; then
        echo "ERROR Incorrect number of parameters!"
        echo "$Usage"
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

    ./gradlew assembleDebug
    ExitIfError

    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXPlatAndroid" \
    --devices ce2f4064 \
    --app-path "$apkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --assembly-dir "$testAssemblyDir"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"

    ExitIfError
}

DoWork() {
    CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork