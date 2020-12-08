#!/bin/bash
set -e

# Mandatory Variable Checks
if [ -z "$SdkName" ]; then
    echo Mandatory parameters not defined: SdkName=$SdkName
    return 1
fi

# Functions

# MIRRORED FROM util.sh
DoesCommandExist() {
    command -v $1 2> /dev/null && return 0
    type $1 2> /dev/null && return 0
    hash $1 2> /dev/null && return 0

    echo Failed to find command: $1
    return 1
}

# MIRRORED FROM sdkUtil.sh
CheckApiSpecSourceDefault() {
    if [ -z "$ApiSpecSource" ]; then
        ApiSpecSource="-apiSpecGitUrl"
    fi
}

# MIRRORED FROM sdkUtil.sh
CheckBuildIdentifierDefault() {
    echo CheckBuildIdentifierDefault $NODE_NAME $EXECUTOR_NUMBER $AGENT_ID
    if [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$NODE_NAME" ] && [ ! -z "$EXECUTOR_NUMBER" ]; then
        buildIdentifier="JBuild_${SdkName}_${NODE_NAME}_${EXECUTOR_NUMBER}"
    elif [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$AGENT_ID" ]; then
        buildIdentifier="AdoBuild_${SdkName}_${AGENT_ID}"
    elif [ -z "$buildIdentifier" ]; then
        buildIdentifier="Custom_${SdkName}"
    fi
}

# USAGE NukeAll <pattern>
NukeAll () {
    find . -name "$1" -exec rm -f {} \; 2> /dev/null || true
}

RemoveEmptyDirectories() {
    find . -type d -empty -delete 2> /dev/null || true
}

# USAGE CleanCodeFiles
CleanCodeFiles () {
    pushd "../$destPath"
    NukeAll "*.as"
    NukeAll "*.cpp"
    NukeAll "*.cs"
    NukeAll "*.h"
    NukeAll "*.java"
    NukeAll "*.js"
    NukeAll "*.lua"
    NukeAll "*.m"
    NukeAll "*.php"
    NukeAll "*.py"
    NukeAll "*.ts"
    RemoveEmptyDirectories
    # cmd <<< "attrib -H *.meta /S /D" # Doesn't seem to be working...
    popd
}

BuildSdk () {
    pushd ..
    echo === SHARED BUILDING $SdkName ===
    node generate.js -destPath $destPath $ApiSpecSource -buildIdentifier $buildIdentifier ${@:1}
    popd
}

# Set the script-internal variables
destPath="../sdks/$SdkName"
DoesCommandExist node
CheckApiSpecSourceDefault
CheckBuildIdentifierDefault

# Do the work
if [ "$delSrc" = "true" ]; then
    CleanCodeFiles
fi
BuildSdk ${@:1}
