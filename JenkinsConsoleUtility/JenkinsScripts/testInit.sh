#!/bin/bash
# USAGE: testInit.sh

# USAGE: ForceCD <path>
ForceCD () {
    echo === ForceCD $@ ===
    dirs -c
    if [ -z "$@" ]; then
        return 1
    fi
    cd "$@" 2> /dev/null
    if [ $? -ne 0 ]; then
        mkdir -p "$@"
        cd "$@"
    fi
    #set +x
    return 0
}

# USAGE: ForcePushD <path>
ForcePushD () {
    echo === ForcePushD $@ ===
    if [ -z "$@" ]; then
        return 1
    fi
    pushd "$@" 2> /dev/null
    if [ $? -ne 0 ]; then
        mkdir -p "$@"
        pushd "$@"
    fi
    #set +x
    return 0
}

# USAGE: SyncGitHubRepo <folder> <RepoName>
SyncGitHubRepo () {
    echo === SyncGitHubRepo $@ ===
    ForceCD "$1"
    pushd $2
    if [ $? -ne 0 ]; then
        git clone git@github.com:PlayFab/$1.git
        pushd $2
    fi
    if [ -z "$GITHUB_EMAIL" ]; then
        git config user.email "$GITHUB_EMAIL"
    fi
    git reset head .
    git checkout -- .
    git clean -df
    git checkout master
    git pull origin master
    popd
}

# USAGE: SyncWorkspaceRepo <fromFolder> <toFolder> <RepoName>
SyncWorkspaceRepo () {
    echo === SyncWorkspaceRepo $@ ===
    ForceCD "$2"
    pushd $3
    if [ $? -ne 0 ]; then
        git clone "$1/$3"
        pushd $3
    fi
    if [ -z "$GITHUB_EMAIL" ]; then
        git config user.email "$GITHUB_EMAIL"
    fi
    git reset head .
    git checkout -- .
    git clean -df
    git checkout master
    git pull origin master
    popd
}

# USAGE: DelArcPatches <FullPath>
DelArcPatches (){
    echo === DelArcPatches $@ ===
    cd "$1"
    echo Deleting Arc-Patches in: ${PWD}
    git for-each-ref --format='%(refname:short)' refs/heads/arcpatch* | while read branch; do    BRANCH_EXISTS=$( git ls-remote --heads origin $branch | wc -l );    if [ $BRANCH_EXISTS -eq 0 ]; then        git branch -D $branch;    fi;done
}

# USAGE: ApplyArcPatch
ApplyArcPatch (){
    echo === ApplyArcPatch $@ ===
    if [ $PatchRepoName = "pf-main" ]; then
        cd $WORKSPACE/$PatchRepoName
        echo ==== arc patching pf-main ====
        call arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
    if [ $PatchRepoName = "SDKGenerator" ]; then
        cd $WORKSPACE/$PatchRepoName
        echo ==== arc patching SDKGenerator ====
        call arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
    if [ $PatchRepoName = "$SdkName" ]; then
        cd $WORKSPACE/sdks/$PatchRepoName
        echo ==== arc patching $SdkName ====
        call arc patch $DIFF_NUMBER --conduit-token $JENKINS_PHAB_TOKEN
        echo ==== applyArcPatch Done ====
    fi
}

# USAGE: MainScript
MainScript () {
    echo == MainScript $@ ==
    if [ -z "$SHARED_WORKSPACE" ]; then
        set SHARED_WORKSPACE="$WORKSPACE/../shared"
    fi

    # These are always shared and never arc-patched
    SyncGitHubRepo "$SHARED_WORKSPACE" "API_Specs"
    SyncGitHubRepo "$SHARED_WORKSPACE" "pf-main"
    SyncGitHubRepo "$SHARED_WORKSPACE" "SDKGenerator"
    SyncGitHubRepo "$SHARED_WORKSPACE/sdks" "$SdkName"
    # These can be arc-patched
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "pf-main"
    SyncWorkspaceRepo "$SHARED_WORKSPACE" "$WORKSPACE" "SDKGenerator"
    ForcePushD sdks
    SyncWorkspaceRepo "$SHARED_WORKSPACE/sdks" "$WORKSPACE/sdks" "$SdkName"

    DelArcPatches "$WORKSPACE/pf-main"
    DelArcPatches "$WORKSPACE/SDKGenerator"
    DelArcPatches "$WORKSPACE/sdks/$SdkName"
    
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility"
    cmd <<< "nuget restore JenkinsConsoleUtility.sln"
    popd
    
    pushd "$WORKSPACE/pf-main/Server"
    cmd <<< "nuget restore Server.sln"
    popd

    ApplyArcPatch
}

MainScript "$@"
