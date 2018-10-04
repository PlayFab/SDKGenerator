#!/bin/bash

. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" 2> /dev/null || . ./util.sh 2> /dev/null
. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/sdkUtil.sh" 2> /dev/null || . ./sdkUtil.sh 2> /dev/null

CheckDefault PublishToGit false

DoGitFinalize() {
    ForcePushD "$WORKSPACE/sdks/$SdkName"
    echo === Commit to Git ===
    git fetch --progress origin
    git add -A
    git commit --allow-empty -m "$commitMessage"
    git push origin $GitDestBranch -f -u || (git fetch --progress origin && git push origin $GitDestBranch -f -u)
    popd
}

DoPublishToS3() {
    cd "$WORKSPACE"
    pushd "sdks/$SdkName"
    git clean -dfx
    popd
    
    rm -f repo.zip
    7z a -r repo.zip "sdks/$SdkName"

    CheckDefault VerticalName master
    aws s3 cp repo.zip s3://playfab-sdk-dist/$VerticalName/$SdkName/$(date +%y%d%m)_${S3BuildNum}_$SdkName.zip
}

CheckVerticalizedParameters
if [ $PublishToGit=="true" ]; then
    DoGitFinalize
fi
if [ "$PublishToS3" = "true" ]; then
    DoPublishToS3
fi
