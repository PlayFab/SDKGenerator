#!/bin/bash

set -e

# USAGE: unity_RunAutoTests.bat [<UNITY_VERSION>] [<SdkName>]

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

CurrentInstalledUnityVer=""

if [$UNITY_VERSION="UNITY201"]; then
    CurrentInstalledUnityVer=2020.1.0a23
fi

if [$UNITY_VERSION=="UNITY193" ]; then
    CurrentInstalledUnityVer=2019.3.2f1
fi

if [$UNITY_VERSION=="UNITY192" ]; then
    CurrentInstalledUnityVer=2019.2.21f1
fi

if [$UNITY_VERSION=="UNITY191" ]; then
    CurrentInstalledUnityVer=2019.1.3f1
fi

if [$UNITY_VERSION="UNITY184"]; then
    CurrentInstalledUnityVer=2018.4.17f1
fi

if [UNITY_VERSION="UNITY174"]; then
    CurrentInstalledUnityVer=2017.4.37f1
fi

echo current installed unity version - $CurrentInstalledUnityVer

RepoProject="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject"
BuildIdentifier=JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER}

JenkernaughtSaveCloudScriptResults() {
    echo === Save test results to Jenkernaught ===
    pushd "${WORKSPACE}/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    mono JenkinsConsoleUtility.exe --listencs -buildIdentifier $BuildIdentifier -workspacePath ${WORKSPACE} -timeout 30 -verbose true
    popd
}

RunMacJenkernaught() {
    echo === Build OSX Client Target ===
    pushd "${RepoProject}/"
    /Applications/Unity/Hub/Editor/"${CurrentInstalledUnityVer}"/Unity.app/Contents/MacOS/Unity -projectPath "${RepoProject}" -buildOSXUniversalPlayer "${RepoProject}/testBuilds/PlayFabOSX" -accept-apiupdate -disable-assembly-updater -noUpm -nographics -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeOsxBuild -logFile "${WORKSPACE}/logs/buildMacClient.txt" || (cat "${WORKSPACE}/logs/buildMacClient.txt") || true
    popd
    pushd "${WORKSPACE}/testBuilds/PlayFabOSX/"
    open PlayFabOSX.app
    popd
    JenkernaughtSaveCloudScriptResults
    if [[ $? -ne 0 ]]; then return 1; fi
}

DoWork() {
    . ./unity_copyTestTitleData.sh "${RepoProject}/Assets/Resources" copy || exit 1
    RunMacJenkernaught
}

DoWork