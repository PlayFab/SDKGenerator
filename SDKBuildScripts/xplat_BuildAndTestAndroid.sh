#!/bin/bash
pushd ../../sdks/$SdkName/build/Android
AndroidProjectPath=$PWD
popd

debugApkPath=$AndroidProjectPath/app/build/outputs/apk/debug/app-debug.apk
testAssemblyDir="$1"

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

    # ./gradlew assembleDebug
    ./gradlew build
    ExitIfError

    if [ ! -f "$debugApkPath" ]; then
        echo "Expected APK file was not created"
    fi

    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXPlatAndroid" \
    --devices "PlayFabSDKTeam/android-common" \
    --app-path "$debugApkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --build-dir "$testAssemblyDir"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"

    ExitIfError
}

DoWork() {
    CopyTestTitleData
    if [ "$TestGradleBuild" = "true" ]; then
        BuildAPK
        if [ "$TestOnAppCenter" = "true" ]; then
            TestAPK
        fi
    fi
}

DoWork
