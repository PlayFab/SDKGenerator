#!/bin/bash
pushd ../../sdks/CSharpSdk/XamarinTestRunner
AndroidProjectPath=$PWD
popd

apkPath=$AndroidProjectPath/XamarinTestRunner/XamarinTestRunner.Android/bin/Debug/com.companyname.XamarinTestRunner-Signed.apk
testAssemblyDir="$1"

Usage="./xamarin_BuildAndTestAndroid.sh <path to test assemblies>"
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
    cp -f "$PF_TEST_TITLE_DATA_JSON" "$AndroidProjectPath/XamarinTestRunner/XamarinTestRunner/testTitleData.json"
    ExitIfError
}

BuildAPK() {
    pushd "$AndroidProjectPath"
    ExitIfError

    cmd <<< "call build_Android.cmd"
    ExitIfError

    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXamarinAndroid" \
    --devices "PlayFabSDKTeam/android-common" \
    --app-path "$apkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --build-dir "$testAssemblyDir" \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"

    ExitIfError
}

DoWork() {
    CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork