#!/bin/bash
set -e

# USAGE: . ./util.sh
# Includes a bunch of functions shared by other scripts

# ================= VISUAL STUDIO SECTION =================

# TODO: Mac compatible paths
# TODO: Mac needs "msbuild" without the .exe
# An ordrered list of places to expect MS VS by priority and version
T22_1="C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin"
T22_2="C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin"
T22_3="C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin"
T22_4="C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin"

T19_1="C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\MSBuild\\Current\\Bin"
T19_2="C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin"
T19_3="C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Professional\\MSBuild\\Current\\Bin"
T19_4="C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise\\MSBuild\\Current\\Bin"

T17_1="C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\BuildTools\\MSBuild\\15.0\\Bin"
T17_2="C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Community\\MSBuild\\15.0\\Bin"
T17_3="C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Professional\\MSBuild\\15.0\\Bin"
T17_4="C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Enterprise\\MSBuild\\15.0\\Bin"

Find2022MsBuild() {
    for eachPath in "$T22_1" "$T22_2" "$T22_3" "$T22_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}

Find2022MsBuildNoBT() {
    for eachPath in "$T22_2" "$T22_3" "$T22_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}

Find2019MsBuild() {
    for eachPath in "$T19_1" "$T19_2" "$T19_3" "$T19_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}

Find2019MsBuildNoBT() {
    for eachPath in "$T19_2" "$T19_3" "$T19_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}


Find2017MsBuild() {
    for eachPath in "$T17_1" "$T17_2" "$T17_3" "$T17_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}

Find2017MsBuildNoBT() {
    for eachPath in "$T17_2" "$T17_3" "$T17_4"
    do
        if [ -f "$eachPath\\MSBuild.exe" ]; then
            MSBUILD_EXE="$eachPath\\MSBuild.exe"
            echo "Found MSBUILD_EXE=$MSBUILD_EXE"
            return 0
        fi
    done
    return 1
}

CallVsDevCmdBat() {
    echo --------------Open a Visual Studio 2017 Command Prompt for BUILDING --------------------
    pushd "C:/Program Files (x86)/Microsoft Visual Studio/2017/Enterprise/Common7/Tools"
    cmd <<< "VsDevCmd.bat"
    popd
}

# ================= END VISUAL STUDIO SECTION =================

# ================= BASH HELPER SECTION =================

# USAGE: DoesCommandExist <command name>
DoesCommandExist() {
    command -v $1 2> /dev/null && return 0
    type $1 2> /dev/null && return 0
    hash $1 2> /dev/null && return 0

    echo Failed to find command: $1
    return 1
}

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

# USAGE: CustomizeRetryLoop <RetryCount> <RetrySleepDuration>
# Call this before RetryLoop to customize the RetryCount and RetrySleepDuration of the RetryLoop
CustomizeRetryLoop() {
    if [ -z "$1" ]; then
        RetryCount=6
    else
        RetryCount=$1
    fi

    if [ -z "$2" ]; then
        RetrySleepDuration=5
    else
        RetrySleepDuration=$2
    fi
}

# USAGE: RetryLoop <Executable statement>
# Calls <Executable statement> in a loop until <Executable statement> returns 0
# When <Executable statement> returns 0, Retryloop ends and returns 0
# If attempted ${RetryCount} times, and never returns 0, then RetryLoop returns 1
# Note, this is a constant wait-time, so ${RetrySleepDuration} should be high enough to negate any rapid repetative calls failures
RetryLoop () {
    CheckDefault RetryCount 6
    CheckDefault RetrySleepDuration 5

    echo "Executing: \"${@:1}\", ${RetryCount} times, with ${RetrySleepDuration} sleep duration\n"

    for (( ActiveRetryCount=1; ActiveRetryCount<=${RetryCount}; ActiveRetryCount++ ))
    do
        set +e
        ${@:1}
        RetryResult=$?
        set -e
        if [ "${RetryResult}" = "0" ]; then
            echo "RetryLoop Succeeded on attempt #${ActiveRetryCount}"
            CustomizeRetryLoop
            return 0
        fi
        if [ "${ActiveRetryCount}" -lt "${RetryCount}" ]; then
            echo "Failed #${ActiveRetryCount} with result: ${RetryResult}, sleeping..."
            sleep ${RetrySleepDuration}
        else
            echo "RetryLoop failed ${ActiveRetryCount} times, with final result: ${RetryResult}"
        fi
    done

    CustomizeRetryLoop
    return 1
}

# ================= END BASH HELPER SECTION =================

# ================= GIT HELPER SECTION =================

# USAGE: CheckCreds
CheckCreds () {
    # Check the GitHub credentials and set them if needed
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

    # Check if App Center CLI is installed, it's ok if it doesn't
    DoesCommandExist appcenter || return 0
    # Check the App Center credentials, report "n" to statistics tracking, and fail out if App Center creds are not present
    echo n | appcenter profile list || return 1
}

# USAGE: CleanCurrentRepo [gitBranchName]
CleanCurrentRepo () {
    echo === CleanCurrentRepo $PWD, $@ ===

    RetryLoop _CleanCurrentRepo $1
}

# USAGE: _CleanCurrentRepo <gitBranchName>
_CleanCurrentRepo () {
    BranchName=$1
    CheckDefault BranchName main

    git fetch --progress --recurse-submodules origin || return 1

    if [ "${ActiveRetryCount}" -gt "1" ]; then
        git reset --hard || return 1
        git fetch --progress --recurse-submodules origin || return 1
        git checkout $BranchName || git checkout -b $BranchName || return 1
        git reset --hard origin/$BranchName || return 1
    else
        git checkout $BranchName || git checkout -b $BranchName || return 1
        git pull --ff-only || return 1
    fi

    git remote prune origin || return 1
    git submodule update || return 1

    return 0
}

# USAGE: _CloneGitHubRepo <folder> <RepoName> <cloneFolderName>
_CloneGitHubRepo () {
    ForceCD "$1"
    (
        git clone --recurse-submodules git@github.com:PlayFab/$2.git $3 ||
        sleep $pfGitRetrySleepDuration ||
        git clone --recurse-submodules git@github.com:PlayFab/$2.git $3
    )
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
    if [ ! -d "$3" ]; then
        _CloneGitHubRepo "$1" "$2" "$3"
    fi
    cd "$3"
    CheckCreds
    CleanCurrentRepo "$4"
}

# USAGE: _CloneWorkspaceRepo <fromFolder> <toFolder> <RepoName> <cloneFolderName>
_CloneWorkspaceRepo () {
    ForceCD "$2"
    (
        git clone --recurse-submodules --reference "$1/$3" --dissociate git@github.com:PlayFab/$3.git $4
        sleep $pfGitRetrySleepDuration ||
        git clone --recurse-submodules --reference "$1/$3" --dissociate git@github.com:PlayFab/$3.git $4
    )
}

# USAGE: SyncWorkspaceRepo <fromFolder> <toFolder> <RepoName> [cloneFolderName=RepoName] [branchName="master"]
SyncWorkspaceRepo () {
    echo === SyncWorkspaceRepo $PWD, $@ ===
    if [ -z "$4" ]; then
        set -- "$1" "$2" "$3" "$3" "main"
    elif [ -z "$5" ]; then
        set -- "$1" "$2" "$3" "$4" "main"
    fi
    ForceCD "$2"
    if [ ! -d "$4" ]; then
        _CloneWorkspaceRepo "$1" "$2" "$3" "$4"
    fi
    cd "$4"
    CheckCreds
    CleanCurrentRepo "$5"
}

# ================= END GIT HELPER SECTION =================


echo util.sh loaded
