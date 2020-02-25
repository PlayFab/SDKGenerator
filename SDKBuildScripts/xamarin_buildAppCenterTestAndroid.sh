#!/bin/bash

set -e

Usage="./xamarin_BuildAndTestAndroid.sh <path to test assemblies> <path to XamarinTestRunner project>"
ArgCount=$#
CheckParameters() {
    if [ $ArgCount -ne 2 ]; then
        echo "ERROR Incorrect number of parameters!"
        echo "$Usage"
        exit 1
    fi
}
CheckParameters

testAssemblyDir="$1"
AndroidProjectPath="$2"

debugApkPath=$AndroidProjectPath/XamarinTestRunner/XamarinTestRunner.Android/bin/Debug/com.companyname.XamarinTestRunner-Signed.apk

CopyTestTitleData() {
    cp -f "$WORKSPACE/JenkinsSdkSetupScripts/Creds/testTitleData.json" "$AndroidProjectPath/XamarinTestRunner/XamarinTestRunner/testTitleData.json"
}

BuildAPK() {
    pushd "$AndroidProjectPath"

    # NOTE: Bash can't detect if the internal statement inside cmd failed
    cmd <<< "call ${AndroidProjectPath}\build_Android.cmd"

    if [ ! -f "$debugApkPath" ]; then
        echo "Expected APK file was not created"
        exit 1
    fi

    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXamarinAndroid" \
    --devices "PlayFabSDKTeam/android-common" \
    --app-path "$debugApkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --build-dir "$testAssemblyDir" \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"
}

DoWork() {
    CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork