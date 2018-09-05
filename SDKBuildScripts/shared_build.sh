#!/bin/bash

# Mandatory Variable Checks
if [ -z "$SdkName" ] || [ -z "$targetSrc" ]; then
    echo Mandatory parameters not defined: SdkName=$SdkName targetSrc=$targetSrc
    exit 1
fi

# Functions
CleanCodeFiles () {
    pushd "../%destPath%"
    rm -r *.as 2> /dev/null || true
    rm -r *.cpp 2> /dev/null || true
    rm -r *.cs 2> /dev/null || true
    rm -r *.h 2> /dev/null || true
    rm -r *.java 2> /dev/null || true
    rm -r *.js 2> /dev/null || true
    rm -r *.lua 2> /dev/null || true
    rm -r *.m 2> /dev/null || true
    rm -r *.php 2> /dev/null || true
    rm -r *.py 2> /dev/null || true
    rm -r *.ts 2> /dev/null || true
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
