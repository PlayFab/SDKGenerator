#!/bin/bash
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

    cmd <<< "call ${AndroidProjectPath}\build_Android.cmd"
    ExitIfError

    if [ ! -f "$debugApkPath" ]; then
        echo "Expected APK file was not created"
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

    ExitIfError
}

DoWork() {
    CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork