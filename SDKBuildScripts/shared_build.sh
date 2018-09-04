#!/bin/bash

# Mandatory Variable Checks
if [ -z "$SdkName" ] || [ -z "$targetSrc" ]; then
    echo Mandatory parameters not defined: SdkName=$SdkName targetSrc=$targetSrc
    return 1
fi

# Functions
CleanCodeFiles () {
    pushd "../%destPath%"
    rm -r *.as
    rm -r *.cpp
    rm -r *.cs
    rm -r *.h
    rm -r *.java
    rm -r *.js
    rm -r *.lua
    rm -r *.m
    rm -r *.php
    rm -r *.py
    rm -r *.ts
    cmd <<< attrib -H *.meta /S /D
    popd
}

BuildSdk () {
    pushd ..
    echo === BUILDING $SdkName ===
    node generate.js $targetSrc=$destPath $apiSpecSource $SdkGenArgs $buildIdentifier $VerticalNameInternal
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
