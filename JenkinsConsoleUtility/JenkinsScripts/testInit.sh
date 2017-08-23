#!/bin/bash
# USAGE: testInit.sh

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh || . util.sh

# Defaults for some variables
CheckDefault SdkName UnitySDK
CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault WORKSPACE C:/proj

# USAGE: DelArcPatches <FullPath>
DelArcPatches (){
    echo === DelArcPatches $PWD, $@ ===
    cd "$1"
    echo Deleting Arc-Patches in: ${PWD}
    git for-each-ref --format='%(refname:short)' refs/heads/arcpatch* | while read branch; do    BRANCH_EXISTS=$( git ls-remote --heads origin $branch | wc -l );    if [ $BRANCH_EXISTS -eq 0 ]; then        git branch -D $branch;    fi;done
}

# USAGE: ApplyArcPatch
ApplyArcPatch (){
    if [ -n "$PatchRepoName" ] && [ "$PatchRepoName" = "pf-main" ]; then
        cd "$WORKSPACE/$PatchRepoName"
        echo ==== arc patching pf-main ====
        arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
    if [ -n "$PatchRepoName" ] && [ "$PatchRepoName" = "SDKGenerator" ]; then
        cd "$WORKSPACE/$PatchRepoName"
        echo ==== arc patching SDKGenerator ====
        arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
    if [ -n "$PatchRepoName" ] && [ "$PatchRepoName" = "SdkName" ]; then
        cd "$WORKSPACE/sdks/$PatchRepoName"
        echo ==== arc patching $SdkName ====
        arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
}

DoNugetWork (){
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility"
    cmd <<< "nuget restore JenkinsConsoleUtility.sln"
    popd
    pushd "$WORKSPACE/pf-main/Server"
    cmd <<< "nuget restore Server.sln"
    popd
}

# USAGE: MainScript
MainScript () {
    echo == MainScript $PWD, $@ ==

    # These are always shared, never modified directly, and never arc-patched
    SyncGitHubRepo "$SHARED_WORKSPACE" "API_Specs"
    SyncGitHubRepo "$SHARED_WORKSPACE" "pf-main"
    SyncGitHubRepo "$SHARED_WORKSPACE" "SDKGenerator"
    SyncGitHubRepo "$SHARED_WORKSPACE/sdks" "$SdkName"

    # These can be arc-patched or modified
    # TEMPORARY: API_Specs might already exist, without being a git repo because of previous script versions
    rm -rf "$WORKSPACE/API_Specs"
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "API_Specs"
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "pf-main"
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "SDKGenerator"
    ForcePushD "$SHARED_WORKSPACE/sdks"
    SyncWorkspaceRepo "$SHARED_WORKSPACE/sdks" "$WORKSPACE/sdks" "$SdkName"

    # It's always safe to remove past arc-patches
    DelArcPatches "$WORKSPACE/pf-main"
    DelArcPatches "$WORKSPACE/SDKGenerator"
    ForcePushD "$SHARED_WORKSPACE/sdks"
    DelArcPatches "$WORKSPACE/sdks/$SdkName"

    DoNugetWork
    ApplyArcPatch
}

MainScript "$@"
