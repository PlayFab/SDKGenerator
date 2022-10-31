#!/bin/sh
set -e

if [ -f "util.sh" ]; then
    . "./sdkUtil.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/SdkGenerator/SetupScripts/sdkUtil.sh" 2> /dev/null
fi

CopyTestTitleDataToUnity() {
    CheckDefaultTitleDataLocation Unity
    echo === CopyTestTitleDataToUnity ===
    # If not defined, grab the default PF_TEST_TITLE_DATA_JSON file (for Unity)
    targetPathMain="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject/Assets/Testing/Resources"    
    targetPathMac="${WORKSPACE}/sdks/${SdkName}/ExampleMacProject/Assets/Testing/Resources"    
    if [ ! -d "$targetPathMain" ]; then
        mkdir -p "$targetPathMain"
    fi
    if [ ! -d "$targetPathMac" ]; then
        mkdir -p "$targetPathMac"
    fi
    cp -T "$PF_TEST_TITLE_DATA_JSON" "$targetPathMain/testTitleData.json" || cp "$PF_TEST_TITLE_DATA_JSON" "$targetPathMain/testTitleData.json"
    cp -T "$PF_TEST_TITLE_DATA_JSON" "$targetPathMac/testTitleData.json" || cp "$PF_TEST_TITLE_DATA_JSON" "$targetPathMac/testTitleData.json"
}

DeleteTestTitleDataFromUnity() {
    CheckDefaultTitleDataLocation Unity
    echo === DeleteTestTitleDataFromUnity ===
    targetPathMain="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject/Assets/Testing/Resources"    
    targetPathMac="${WORKSPACE}/sdks/${SdkName}/ExampleMacProject/Assets/Testing/Resources"    
    rm "$targetPathMain/testTitleData.json"
    rm "$targetPathMac/testTitleData.json"
}