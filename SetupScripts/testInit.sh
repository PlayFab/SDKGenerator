#!/bin/bash
set -e

# USAGE: testInit.sh

if [ -f "util.sh" ]; then
    . "./util.sh" 2> /dev/null
    . "./sdkUtil.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/SdkGenerator/SetupScripts/util.sh" 2> /dev/null
    . "$WORKSPACE/SdkGenerator/SetupScripts/sdkUtil.sh" 2> /dev/null
fi

CheckVerticalizedParameters

DoJcuNugetUpdate () {
    DoesCommandExist nuget || return 1

    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility"
    nuget restore JenkinsConsoleUtility.sln
    popd
}

# USAGE: ResetRepo
ResetRepo () {
    echo === ResetRepo $PWD, $@ ===

    # Assumes the current directory is set to the repo to be reset
    CheckCreds
    git fetch --progress origin
    git checkout master || git checkout -b master || CleanCurrentRepo
    git pull origin master

    # Delete $GitDestBranch, reset it to master, prep for next build and fresh write
    if [ "$GitDestBranch"!="master" ]; then
        git branch -D $GitDestBranch || true
        git checkout -b $GitDestBranch || true
        git checkout $GitDestBranch
    fi
}

# USAGE: DoWork
DoWork () {
    echo == DoWork $PWD, $@ ==

    SyncGitHubRepo "$WORKSPACE" "SDKGenerator" "SDKGenerator" "$GitSdkGenBranch"
    DoJcuNugetUpdate || echo "Failed to Nuget restore JenkinsConsoleUtility"

    SyncGitHubRepo "$WORKSPACE/sdks" "$SdkName" "$SdkName" "$GitSdkDestBranch"
    SyncGitHubRepo "$WORKSPACE" "API_Specs"

    if [ ! -z "$SdkGenPrvTmplRepo" ]; then
        SyncGitHubRepo "$WORKSPACE/SDKGenerator/privateTemplates" "$SdkGenPrvTmplRepo" "$SdkGenPrvTmplRepo" "$GitPrvTmplBranch"
    fi

    ForcePushD "$WORKSPACE/sdks/$SdkName"
    ResetRepo
}

echo === Beginning testInit ===
DoWork "$@"
