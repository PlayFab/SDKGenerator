#!/bin/bash
set -e

# USAGE: . ./sdkUtil.sh
# Includes a bunch of sdk-specific functions shared by other scripts

if [ -f "util.sh" ]; then
    . "./util.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/SdkGenerator/SetupScripts/util.sh" 2> /dev/null
fi

FailIfPublishing() {
    echo $1
    if [ "$GitDestBranch" != "doNotCommit" ]; then
        return 1 # We cannot commit to this branch name
    else
        echo "  .. but it is ok, because we will not commit to that branch"
    fi
}

# Invalid branch names and reasonings:
# "invalid": a default-placeholder so that people do not do builds without making a choice
# "automated": the old branch name, and we want to make a clean break from it (and debug any leftover problems)
# "master": we never want to commit directly to master, ever, for any reason
# "versioned": we never want to commit directly to versioned, ever, for any reason
#
# $GitDestBranch == "doNotCommit" ignores restrictions, because it will still use "doNotCommit" for the local machine build, but will not commit to it, so it is safe
# Verticalized builds prepend with "vertical-", so edge-case vertical names cannot clobber a branch we want to protect
CheckVerticalizedParameters() {
    # Typical builds will meet none of these conditions, and this function will have no effect
    if [ -z "$GitDestBranch" ] || [ "$GitDestBranch" = "invalid" ] || [ "$GitDestBranch" = "master" ] || [ "$GitDestBranch" = "versioned" ] || [ "$GitDestBranch" = "automated" ]; then
        FailIfPublishing "INVALID GitDestBranch: ($GitDestBranch, $VerticalName)"
    elif [ "$GitDestBranch" = "verticalName" ]; then
        if [ -z "$VerticalName" ]; then
            FailIfPublishing "INVALID GitDestBranch, cannot be assigned to VerticalName: ($GitDestBranch, $VerticalName)"
        else
            # This is the expected-correct path for verticalized-builds
            GitDestBranch="vertical-$VerticalName"
        fi
    fi
    if [ "$VerticalName" = "master" ]; then
        echo "VerticalName = master, should not be manually specified, it's implied. (A lot of stuff will break if master is explicit)"
        return 1 # We want to fail this case, regardless of publish state
    elif [ ! -z "$VerticalName" ]; then
        if [ "$GitDestBranch" != "vertical-$VerticalName" ]; then
            FailIfPublishing "Output branch must be verticalName when building a vertical"
        elif [ "$ApiSpecSource" != "-apiSpecPfUrl" ] && [ "$ApiSpecSource" != "-apiSpecPfUrl https://${VerticalName}.playfabapi.com/apispec" ]; then
            echo "ApiSpecSource must be -apiSpecPfUrl when building a vertical, or else it won't build what you expect"
            return 1
        fi
    fi
}

CheckApiSpecSourceDefault() {
    if [ -z "$ApiSpecSource" ]; then
        ApiSpecSource="-apiSpecGitUrl"
    fi
    # TODO: Update with ClusterName
    # if [ "$ApiSpecSource" = "-apiSpecPfUrl" ] && [ ! -z "$VerticalName" ]; then
        # ApiSpecSource="-apiSpecPfUrl https://${VerticalName}.playfabapi.com/apispec"
    # fi
}

CheckBuildIdentifierDefault() {
    echo CheckBuildIdentifierDefault $NODE_NAME $EXECUTOR_NUMBER $AGENT_ID
    if [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$NODE_NAME" ] && [ ! -z "$EXECUTOR_NUMBER" ]; then
        buildIdentifier="JBuild_${SdkName}_${NODE_NAME}_${EXECUTOR_NUMBER}"
    elif [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$AdoBuildId" ]; then
        # When we manually define AdoBuildId, this is the more reliable way to determine a unique build (Multi-machine builds)
        buildIdentifier="AdoBuild_${SdkName}_${AdoBuildId}"
    elif [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$AGENT_ID" ]; then
        # When we do not have AdoBuildId, we use the machine ID in order to determine uniqueness (Single-machine builds)
        buildIdentifier="AdoBuild_${SdkName}_${AGENT_ID}"
    elif [ -z "$buildIdentifier" ]; then
        buildIdentifier="Custom_${SdkName}"
    fi
}

BuildJCU() {
    Find2019MsBuild || Find2017MsBuild

    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility"
    nuget restore JenkinsConsoleUtility.sln
    # Escape windows style "slash commands" so bash doesn't try to convert them to paths
    # Mac needs "msbuild" without the .exe
    "$MSBUILD_EXE" JenkinsConsoleUtility.csproj //p:configuration="Debug" //p:platform="AnyCPU" || \
    cmd <<< "\"$MSBUILD_EXE\" JenkinsConsoleUtility.csproj /p:configuration=\"Debug\" /p:platform=\"AnyCPU\" || exit 1"
    popd
}

# USAGE: _CallJcuBash <JenkinsConsoleUtility arguments>
_CallJcuBash() {
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    # KNOWN: Execute "permission denied" on a Mac gives error code 1
    # KNOWN: "cannot execute binary file" on a Mac gives error code 126
    chmod +x JenkinsConsoleUtility.exe
    ./JenkinsConsoleUtility.exe ${@:1}
    tempErr=$?
    if [ "$tempErr" -ne "0" ]; then
        echo "Bash JenkinsConsoleUtility exec failed with error: $tempErr"
    fi
    popd
    return $tempErr
}

# USAGE: _CallJcuMono <JenkinsConsoleUtility arguments>
_CallJcuMono() {
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    # KNOWN: if "mono" command doesn't exist, then the error code is 127
    mono JenkinsConsoleUtility.exe ${@:1}
    tempErr=$?
    if [ "$tempErr" -ne "0" ]; then
        echo "Bash JenkinsConsoleUtility exec failed with error: $tempErr"
    fi
    popd
    return $tempErr
}

# USAGE: _CallJcuCmd <JenkinsConsoleUtility arguments>
_CallJcuCmd() {
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    cmd <<< "JenkinsConsoleUtility.exe ${@:1} || exit 1"
    tempErr=$?
    if [ "$tempErr" -ne "0" ]; then
        echo "Cmd JenkinsConsoleUtility exec failed with error: $tempErr"
    fi
    popd
    return $tempErr
}

# USAGE: CallJCU <JenkinsConsoleUtility arguments>
CallJCU() {
    echo === Call JCU: ${@:1} ===
    
    if [ ! -d "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug" ]; then
        BuildJCU
    fi

    _CallJcuBash ${@:1} || tempErr=$?
    # An error code of 1 probably means it actually called JCU and could not get results
    if [ "$tempErr" -eq "0" ] || [ "$tempErr" -eq "1" ]; then
        return $tempErr
    fi
    _CallJcuMono ${@:1} || tempErr=$?
    # An error code of 1 probably means it actually called JCU and could not get results
    if [ "$tempErr" -eq "0" ] || [ "$tempErr" -eq "1" ]; then
        return $tempErr
    fi
    _CallJcuCmd ${@:1}
}

CheckDefaultTitleDataLocation() {
    if [ -z "$PF_TEST_TITLE_DATA_JSON" ]; then
        if [ "$1" == "Unity" ]; then
            PF_TEST_TITLE_DATA_JSON="$WORKSPACE/SdkGenerator/SetupScripts/unityTestTitleData.json"
        else
            PF_TEST_TITLE_DATA_JSON="$WORKSPACE/SdkGenerator/SetupScripts/testTitleData.json"
        fi
    fi
    if [ ! -f "$PF_TEST_TITLE_DATA_JSON" ]; then
        echo === PF_TEST_TITLE_DATA_JSON is not a valid file location: $PF_TEST_TITLE_DATA_JSON
        return 1
    fi
    export PF_TEST_TITLE_DATA_JSON=$PF_TEST_TITLE_DATA_JSON
}

ListenCsJCU() {
    echo === Retrieve $SdkName UnitTest results ===
    CheckBuildIdentifierDefault
    CheckDefaultTitleDataLocation
    CallJCU --listencs -buildIdentifier $buildIdentifier -workspacePath "$WORKSPACE" -timeout 60 -verbose true
    if [ ! -z "$killTaskName" ]; then
        CallJCU --kill -taskname $killTaskName
    fi
}

SyncSdkRepoSubmodules() {
    # ----- git submodules check begin -----
    pushd "$WORKSPACE/sdks/$SdkName"
    if [ -f "set-gitmodules.sh" ]; then
        echo set-gitmodules.sh file detected, running it...
        . ./set-gitmodules.sh
    elif [ -f "set-gitmodules.bat" ]; then
        echo set-gitmodules.bat file detected, running it...
        cmd <<< "set-gitmodules.bat || return 1"
    fi
    popd
    # ----- git submodules check end -----
}

echo sdkUtil.sh loaded
