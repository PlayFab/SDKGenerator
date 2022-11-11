#!/bin/bash
set -e

# USAGE: . ./acUtil.sh
# Includes a bunch of functions shared by scripts that utilize App Center

# Global input variables:
# AppCenterGitRepoBranchName
# AppCenterJobName
# AppCenterFileName
# AppCenterTestAssembliesPath
# AppCenterDeviceName
# XAMARIN_UITEST_TOOLS

if [ -f "util.sh" ]; then
    . "./util.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/SdkGenerator/SetupScripts/util.sh" 2> /dev/null
fi

#queue the appcenter build
QueueAppCenterBuild() {
    appcenter build queue --app $AppCenterJobName --branch $AppCenterGitRepoBranchName --quiet -d
    RetryLoop "GetAppCenterStatusJsonWithoutStatus || DisplayAppCenterDebugLog"
    AppCenterBuildStatus="notStarted"
}

DisplayAppCenterDebugLog() {
    # After a "build branches show" failure, do it again, with debug enabled, to get a full description of the problem
    echo ====================== BEGIN HEISENBUG DEBUG LOG ======================
    appcenter build branches show -b $AppCenterGitRepoBranchName -a "$AppCenterJobName" --debug --output json
    echo ====================== END HEISENBUG DEBUG LOG ======================
    # We already failed, we're just trying to produce a better log of the failure - return 1 to propagate the failure
    return 1
}

GetAppCenterStatusJsonWithoutStatus() {
    AppCenterBuildStatus="notStarted"
    AppCenterBuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "$AppCenterJobName" --quiet --output json) || return 1
}

GetAppCenterStatusJsonWithStatus() {
    AppCenterBuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "$AppCenterJobName" --quiet --output json)
    AppCenterBuildStatus=$(echo "$AppCenterBuildStatusJSON" | jq .status)
    AppCenterBuildStatus=$(sed -e 's/^"//' -e 's/"$//' <<<"$AppCenterBuildStatus")
}

# Monitor the status of the build and wait until it is complete.
# usage: CheckAppCenterStatus <acceptedStatusList = "notStarted,inProgress,completed">
CheckAppCenterStatus() {
    AppCenterExpectedStatusList=$1
    CheckDefault AppCenterExpectedStatusList "notStarted,inProgress,completed"

    GetAppCenterStatusJsonWithStatus
    echo "WaitForAppCenterBuild check number: $ActiveRetryCount, Build Status: $AppCenterBuildStatus"

    echo " === DEBUG: CheckAppCenterStatus case $AppCenterBuildStatus in $AppCenterExpectedStatusList"
    if [[ "$AppCenterExpectedStatusList" == *"$AppCenterBuildStatus"* ]]; then
        return 0
    fi
    return 1
}

# usage: WaitForAppCenterBuild
WaitForAppCenterBuild() {
    # Status can/should be minimum "notStarted" very quickly
    CustomizeRetryLoop 10 1
    RetryLoop CheckAppCenterStatus "notStarted,inProgress,partiallySucceeded,completed"

    # It can take forever to transition from "notStarted" -> "inProgress" due to limited AC queue space
    CustomizeRetryLoop 60 60
    RetryLoop CheckAppCenterStatus "inProgress,partiallySucceeded,completed"

    # Most of these finish quickly, but Unity iOS takes forever
    CustomizeRetryLoop 60 60
    RetryLoop CheckAppCenterStatus "partiallySucceeded,completed"

    #Reset to default
    CustomizeRetryLoop

    #Get data for next steps
    ExtractBuildResults
    return 0
}

ExtractBuildResults() {
    #extract the results and build number
    AppCenterBuildResult=$(echo "$AppCenterBuildStatusJSON" | jq .result)
    AppCenterBuildNumber=$(echo "$AppCenterBuildStatusJSON" | jq .buildNumber | sed s/\"//g)

    echo "Build $AppCenterBuildNumber has $AppCenterBuildResult."
}

#Return the appcenter build repo to a clean state for next time.
CleanupAppCenterBranch() {
    pushd "$AppCenterRepoParentDir/$GitRepoFolderName"
    git reset --hard $AppCenterGitRepoCleanTag
    git push --force
    popd
}

#Download the build if successful, or print the logs if not.
DownloadIpa() {
    shopt -s nocasematch

    set +e
    CheckAppCenterStatus "partiallySucceeded,completed"
    AppCenterFinalSuccess=$?
    set -e
    if [ "$AppCenterFinalSuccess" = "0" ]; then
        appcenter build download --type build --app "$AppCenterJobName" --id $AppCenterBuildNumber --file "$AppCenterFileName"
    else
        appcenter build logs --app "$AppCenterJobName" --id $AppCenterBuildNumber >> "build_logs_${BuildNumber}.txt"
        exit 1
    fi
}

RunAppCenterTest() {
    appcenter test run uitest --app "$AppCenterJobName" \
    --devices "$AppCenterDeviceName" \
    --app-path "$AppCenterFileName" \
    --test-series "master" \
    --locale "en_US" \
    --assembly-dir "$AppCenterTestAssembliesPath"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"
}

echo acUtil.sh loaded
