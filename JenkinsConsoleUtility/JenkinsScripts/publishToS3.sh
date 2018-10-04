#!/bin/bash

. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" 2> /dev/null || . ./util.sh 2> /dev/null
. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/sdkUtil.sh" 2> /dev/null || . ./sdkUtil.sh 2> /dev/null

DoWork() {
    cd "$WORKSPACE"
    pushd "sdks/$SdkName"
    git clean -dfx
    popd
    
    rm -f repo.zip
    7z a -r repo.zip "sdks/$SdkName"

    CheckDefault VerticalName master
    aws s3 cp repo.zip s3://playfab-sdk-dist/$VerticalName/$SdkName/$(date +%y%d%m)_${S3BuildNum}_$SdkName.zip
}

if [ "$PublishToS3" = "true" ]; then
    DoWork
fi
