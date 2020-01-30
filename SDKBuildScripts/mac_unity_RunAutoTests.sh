#!/bin/bash

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

RepoProject="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject"
ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
BuildIdentifier=JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER}

JenkernaughtSaveCloudScriptResults() {
    echo === Save test results to Jenkernaught ===
    pushd "${WORKSPACE}/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    cmd <<< "JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath ${WORKSPACE} -timeout 30 -verbose true"
    # . ./JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath ${WORKSPACE} -timeout 30 -verbose true
    popd
}

RunMacJenkernaught() {
    echo === Build OSX Client Target ===
    pushd "${ProjRootPath}/${SdkName}_TC/"
    $UNITY_VERSION -buildOSXUniversalPlayer "${ProjRootPath}/${SdkName}_TC" -accept-apiupdate -disable-assembly-updater -noUpm -nographics -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeOsxBuild -logFile "${WORKSPACE}/logs/buildOSXClient.txt" || (cat "${WORKSPACE}/logs/buildOSXClient.txt" && return 1)
    popd

    JenkernaughtSaveCloudScriptResults
    if [[ $? -ne 0 ]]; then return 1; fi
}

DoWork() {
    . ./unity_copyTestTitleData.sh "${RepoProject}/Assets/Resources" copy || exit 1
    RunMacJenkernaught
}

DoWork