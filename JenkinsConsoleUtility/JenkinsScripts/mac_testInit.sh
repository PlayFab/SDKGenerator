#!/bin/bash
# USAGE: testInit.sh

# $WORKSPACE/SDKGenerator doesn't exist until later in this file
. "$SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" 2> /dev/null || . ./util.sh 2> /dev/null
. "$SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/sdkUtil.sh" 2> /dev/null || . ./sdkUtil.sh 2> /dev/null

CheckVerticalizedParameters

# Defaults for some variables
CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault WORKSPACE C:/proj

# DoJcuNugetUpdate (){
#     pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility"
#     cmd <<< "nuget restore JenkinsConsoleUtility.sln"
#     popd
# }

# USAGE: ResetRepo
ResetRepo (){
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

    # These are always shared, never modified directly, and never arc-patched
    # We sync master on the SHARED_WORKSPACE
    SyncGitHubRepo "$SHARED_WORKSPACE" "SDKGenerator" "SDKGenerator"
    SyncGitHubRepo "$SHARED_WORKSPACE/sdks" "$SdkName"
    # We sync $GitSdkGenBranch in the real workspace
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "SDKGenerator" "SDKGenerator" "$GitSdkGenBranch"
    SyncWorkspaceRepo "$SHARED_WORKSPACE/sdks" "$WORKSPACE/sdks" "$SdkName" "$GitSdkDestBranch"

    if [ ! -z "$SdkGenPrvTmplRepo" ]; then
        SyncGitHubRepo "$WORKSPACE/SDKGenerator/privateTemplates" "$SdkGenPrvTmplRepo" "$SdkGenPrvTmplRepo" "$GitPrvTmplBranch"
    fi

    # DoJcuNugetUpdate
    
    ForcePushD "$WORKSPACE/sdks/$SdkName"
    ResetRepo
}

echo === Beginning testInit ===
DoWork "$@"
