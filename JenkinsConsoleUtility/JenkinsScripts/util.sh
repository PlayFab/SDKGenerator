#!/bin/bash
# USAGE: . ./util.sh
# Includes a bunch of functions shared by other scripts

# USAGE: CheckDefault <variable> <new value if unset>
CheckDefault() {
    eval $1="\${$1:-\${@:2}}"
}

# USAGE: _MakeDirCd <path>
_MakeDirCd () {
    mkdir -p "$@"
    cd "$@"
}

# USAGE: ForceCD <path>
ForceCD () {
    echo === ForceCD $PWD, $@ ===
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
    echo === ForcePushD $PWD, $@ ===
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

# USAGE: CleanCurrentRepo [hard] [sleep] [retryCounter]
CleanCurrentRepo () {
    echo === CleanCurrentRepo $PWD, $@ ===
    retryCounter="0"
    if [ -n "$3" ] && [ "$3" -gt "10" ]; then
        exit 10 # Timeout
    elif [ -n "$3" ]; then
        let retryCounter="$3+1"
    fi

    if [ -n "$2" ]; then
        # Sleep for a bit before trying to sync
        sleep $2
    fi

    git fetch --progress origin || CleanCurrentRepo hard 3 $retryCounter
    if [ -n "$1" ]; then
        git reset --hard || CleanCurrentRepo hard 3 $retryCounter
        git fetch --progress origin
        git checkout master || git checkout -b master || CleanCurrentRepo hard 3 $retryCounter
        git reset --hard origin/master || CleanCurrentRepo hard 3 $retryCounter
    else
        git checkout master || git checkout -b master || CleanCurrentRepo hard 3 $retryCounter
        git pull --ff-only || CleanCurrentRepo hard 3 $retryCounter
    fi
    git remote prune origin
}

# USAGE: _CloneGitHubRepo <folder> <RepoName>
_CloneGitHubRepo () {
    ForceCD "$1"
    git clone --recurse-submodules git@github.com:PlayFab/$2.git
    cd $2
}

# USAGE: SyncGitHubRepo <folder> <RepoName>
SyncGitHubRepo () {
    echo === SyncGitHubRepo $PWD, $@ ===
    ForceCD "$1"
    cd $2 || _CloneGitHubRepo "$1" "$2"
    SetGitHubCreds
    CleanCurrentRepo
}

# USAGE: _CloneWorkspaceRepo <fromFolder> <toFolder> <RepoName>
_CloneWorkspaceRepo () {
    ForceCD "$2"
    git clone --recurse-submodules --reference "$1/$3" --dissociate git@github.com:PlayFab/$3.git
    cd $3
}

# USAGE: SyncWorkspaceRepo <fromFolder> <toFolder> <RepoName>
SyncWorkspaceRepo () {
    echo === SyncWorkspaceRepo $PWD, $@ ===
    ForceCD "$2"
    cd $3 || _CloneWorkspaceRepo "$1" "$2" "$3"
    SetGitHubCreds
    CleanCurrentRepo hard
}

echo util.sh loaded
