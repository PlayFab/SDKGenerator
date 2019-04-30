#!/bin/bash
# USAGE: . ./util.sh
# Includes a bunch of functions shared by other scripts

# This can be reset to change the pfGitRetrySleepDuration but generally it shouldn't change
pfGitRetrySleepDuration=3

# USAGE: CheckDefault <variable> <new value if unset>
CheckDefault () {
    eval $1="\${$1:-\${@:2}}"
}

# USAGE: _MakeDirCd <path>
_MakeDirCd () {
    mkdir -p "$@"
    cd "$@"
}

# USAGE: ForceCD <path>
ForceCD () {
    # echo === ForceCD $PWD, $@ ===
    dirs -c
    if [ -z "$@" ]; then
        return 1
    fi
    cd "$@" 2> /dev/null || _MakeDirCd "$@"
    return 0
}

# USAGE: _MakeDirPushD <path>
_MakeDirPushD () {
    mkdir -p "$@"
    pushd "$@"
}

# USAGE: ForcePushD <path>
ForcePushD () {
    # echo === ForcePushD $PWD, $@ ===
    if [ -z "$@" ]; then
        return 1
    fi
    pushd "$@" 2> /dev/null || _MakeDirPushD "$@"
    return 0
}

# USAGE: SetGitHubCreds
SetGitHubCreds () {
    testEmail=$(git config --global user.email) || true
    testName=$(git config --global user.name) || true
    if [ -z "$testEmail" ] && [ -z "$testName"]; then
        if [ -n "$GITHUB_EMAIL" ]; then
            git config --global user.email "$GITHUB_EMAIL" || true
        fi
        if [ -n "$GITHUB_USERNAME" ]; then
            git config --global user.name "$GITHUB_USERNAME" || true
        fi
    fi
	git config --global core.autocrlf "input" || true
	git config core.autocrlf "input" || true
    unset testEmail
    unset testName
}

# USAGE: CleanCurrentRepo [gitBranchName]
CleanCurrentRepo () {
    echo === CleanCurrentRepo $PWD, $@ ===

    if [ -z "$1" ]; then
        _CleanCurrentRepo 0 "master"
    else
        _CleanCurrentRepo 0 $1
    fi
}

# USAGE: _CleanCurrentRepo <retryCounter> <gitBranchName>
_CleanCurrentRepo () {
    # Increment the retryCounter
    set -- $(("$1+1")) $2
    if [ "$1" -gt "10" ]; then
        exit 10 # Timeout
    fi

    if [ "$1" -gt "1" ]; then
        # Sleep for a bit before trying to sync
        sleep $pfGitRetrySleepDuration
    fi

    (
        git fetch --progress origin &&
        if [ "$1" -gt "1" ]; then
            (
                git reset --hard &&
                git fetch --progress origin &&
                (git checkout $2 || git checkout -b $2) &&
                git reset --hard origin/$2
            ) || _CleanCurrentRepo $@
        else
            (
                (git checkout $2 || git checkout -b $2) &&
                git pull --ff-only
            ) || _CleanCurrentRepo $@
        fi &&
        git remote prune origin
    ) || _CleanCurrentRepo $@
}

# USAGE: _CloneGitHubRepo <folder> <RepoName> <cloneFolderName>
_CloneGitHubRepo () {
    ForceCD "$1"
    git clone --recurse-submodules git@github.com:PlayFab/$2.git $3
    cd "$3"
}

# USAGE: SyncGitHubRepo <folder> <RepoName> [cloneFolderName=RepoName] [branchName="master"]
SyncGitHubRepo () {
    echo === SyncGitHubRepo $PWD, $@ ===
    ForceCD "$1"
    if [ -z "$3" ]; then
        set -- "$1" "$2" "$2" "master"
    elif [ -z "$4" ]; then
        set -- "$1" "$2" "$3" "master"
    fi
    cd "$3" || _CloneGitHubRepo "$1" "$2" "$3"
    SetGitHubCreds
    CleanCurrentRepo "$4"
}

# USAGE: _CloneWorkspaceRepo <fromFolder> <toFolder> <RepoName> <cloneFolderName>
_CloneWorkspaceRepo () {
    ForceCD "$2"
    git clone --recurse-submodules --reference "$1/$3" --dissociate git@github.com:PlayFab/$3.git $4
    cd "$4"
}

# USAGE: SyncWorkspaceRepo <fromFolder> <toFolder> <RepoName> [cloneFolderName=RepoName] [branchName="master"]
SyncWorkspaceRepo () {
    echo === SyncWorkspaceRepo $PWD, $@ ===
    if [ -z "$4" ]; then
        set -- "$1" "$2" "$3" "$3" "master"
    elif [ -z "$5" ]; then
        set -- "$1" "$2" "$3" "$4" "master"
    fi
    ForceCD "$2"
    cd "$4" || _CloneWorkspaceRepo "$1" "$2" "$3" "$4"
    SetGitHubCreds
    CleanCurrentRepo "$5"
}

echo util.sh loaded
