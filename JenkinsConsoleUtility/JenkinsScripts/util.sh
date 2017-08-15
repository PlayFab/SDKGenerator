#!/bin/bash
# USAGE: . util.sh
# Includes a bunch of super handy functions that are shared by a bunch of different scripts

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
    cd "$@" || _MakeDirCd "$@"
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
    pushd "$@" || _MakeDirPushD "$@"
    return 0
}

# USAGE: SetGitHubCreds
SetGitHubCreds () {
    if [ -n "$GITHUB_EMAIL" ]; then
        git config --global user.email "$GITHUB_EMAIL"
    fi
    if [ -n "$GITHUB_USERNAME" ]; then
        git config --global user.email "$GITHUB_USERNAME"
    fi
}

# USAGE: NukeCurrentRepo
NukeCurrentRepo () {
    git fetch --progress origin
    git reset --hard
    git checkout master
    git reset --hard origin/master
    git remote prune origin
}

# USAGE: _CloneGitHubRepo <folder> <RepoName>
_CloneGitHubRepo () {
    ForceCD "$1"
    git clone git@github.com:PlayFab/$2.git
    cd $2
}

# USAGE: SyncGitHubRepo <folder> <RepoName>
SyncGitHubRepo () {
    echo === SyncGitHubRepo $PWD, $@ ===
    ForceCD "$1"
    cd $2 || _CloneGitHubRepo "$1" "$2"
    SetGitHubCreds
    NukeCurrentRepo
}

# USAGE: _CloneWorkspaceRepo <fromFolder> <toFolder> <RepoName>
_CloneWorkspaceRepo () {
    ForceCD "$2"
    git clone --reference "$1/$3" git@github.com:PlayFab/$3.git
    cd $3
}

# USAGE: SyncWorkspaceRepo <fromFolder> <toFolder> <RepoName>
SyncWorkspaceRepo () {
    echo === SyncWorkspaceRepo $PWD, $@ ===
    ForceCD "$2"
    cd $3 || _CloneWorkspaceRepo "$1" "$2" "$3"
    SetGitHubCreds
    NukeCurrentRepo
}

echo util.sh loaded
