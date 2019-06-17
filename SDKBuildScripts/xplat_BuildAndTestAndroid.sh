#!/bin/bash
AndroidProjectPath=$1
apkPath=$AndroidProjectPath/app/build/outputs/apk/debug/app-debug.apk

CopyTestTitleData() {
    cp -f "$PF_TEST_TITLE_DATA_JSON" $AndroidProjectPath/app/src/main/assets
}

BuildAPK() {
    pushd $AndroidProjectPath
    ./gradlew assembleDebug
    popd
}

TestAPK() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXPlatAndroid" \
    --devices ce2f4064 \
    --app-path "$apkPath"  \
    --test-series "master" \
    --locale "en_US" \
    --assembly-dir "C:/github/pf/SDKGenerator/SDKBuildScripts/AppCenterUITestLauncher/AppCenterUITestLauncher/debugassemblies"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"
}

DoWork() {
   # CopyTestTitleData
    BuildAPK
    TestAPK
}

DoWork