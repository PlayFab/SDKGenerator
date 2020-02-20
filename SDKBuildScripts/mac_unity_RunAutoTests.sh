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

# TODO: we need specific versions of Unity targeted below. Right now we are hard coded to 2019.1.3 (this may be problematic to upgrades)

RepoProject="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject"
ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
BuildIdentifier=JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER}

JenkernaughtSaveCloudScriptResults() {
    echo === Save test results to Jenkernaught ===
    pushd "${WORKSPACE}/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    mono JenkinsConsoleUtility.exe --listencs -buildIdentifier $BuildIdentifier -workspacePath ${WORKSPACE} -timeout 30 -verbose true
    # . ./JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath ${WORKSPACE} -timeout 30 -verbose true
    popd
}

RunMacJenkernaught() {
    echo === Build OSX Client Target ===
    pushd "${RepoProject}/"
    #/Applications/Unity/Hub/Editor/2019.1.3f1/Unity.app/Contents/MacOS/Unity -projectPath "${RepoProject}" -buildOSXUniversalPlayer "${ProjRootPath}/${SdkName}_TC" -accept-apiupdate -disable-assembly-updater -noUpm -nographics -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeOsxBuild -logFile "${WORKSPACE}/logs/buildOSXClient.txt" || (cat "${WORKSPACE}/logs/buildOSXClient.txt" && return 1)
    /Applications/Unity/Hub/Editor/2019.1.3f1/Unity.app/Contents/MacOS/Unity -projectPath "${RepoProject}" -buildOSXUniversalPlayer "${RepoProject}" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeOsxBuild -logFile "${WORKSPACE}/logs/buildMacClient.txt" || (cat "${WORKSPACE}/logs/buildMacClient.txt" && return 1)
    popd
    JenkernaughtSaveCloudScriptResults
    if [[ $? -ne 0 ]]; then return 1; fi
}

DoWork() {
    . ./unity_copyTestTitleData.sh "${RepoProject}/Assets/Resources" copy || exit 1
    RunMacJenkernaught
}

DoWork