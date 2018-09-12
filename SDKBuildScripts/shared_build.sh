#!/bin/bash

# Mandatory Variable Checks
if [ -z "$SdkName" ] || [ -z "$targetSrc" ]; then
    echo Mandatory parameters not defined: SdkName=$SdkName targetSrc=$targetSrc
    exit 1
fi

# Functions

# USAGE NukeAll <pattern>
NukeAll () {
    find . -name "$1" -exec rm -f {} \; 2> /dev/null || true
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
    # cmd <<< "attrib -H *.meta /S /D" # Doesn't seem to be working...
    popd
}

BuildSdk () {
    pushd ..
    echo === SHARED BUILDING $SdkName ===
    if [ -z "$quickTest" ]; then
        node generate.js $targetSrc=$destPath $apiSpecSource $SdkGenArgs $buildIdentifier $VerticalNameInternal
    else
        echo node generate.js $targetSrc=$destPath $apiSpecSource $SdkGenArgs $buildIdentifier $VerticalNameInternal
    fi
    popd
}

# Set the script-internal variables
destPath="../sdks/$SdkName"
if [ -z "$apiSpecSource" ]; then
    apiSpecSource="-apiSpecGitUrl"
fi
if [ -z "$buildIdentifier" ] && [ ! -z "$SdkName" ] && [ ! -z "$NODE_NAME" ] && [ ! -z "$EXECUTOR_NUMBER" ]; then
    buildIdentifier="-buildIdentifier JBuild_${SdkName}_${VerticalName}_${NODE_NAME}_${EXECUTOR_NUMBER}"
fi
if [ ! -z "$VerticalName" ]; then
    VerticalNameInternal="-VerticalName $VerticalName"
fi

# Do the work
if [ "$delSrc" == "true" ]; then
    CleanCodeFiles
fi
BuildSdk
