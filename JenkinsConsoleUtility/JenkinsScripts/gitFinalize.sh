#!/bin/bash

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

CheckDefault gitTarget $AUTOMATED_GIT_BRANCH
# CheckDefault WORKSPACE C:/proj
CheckDefault SHARED_WORKSPACE C:/depot
# CheckDefault SdkName UnitySDK
CheckDefault PublishToGit false

ForcePushD "$WORKSPACE/sdks/$SdkName"

if [ $PublishToGit=="true" ]; then
    echo === Commit to Git ===
    git fetch --progress origin
    git add -A
    git commit --allow-empty -m "$commitMessage"
    git push origin $gitTarget -f -u || (git fetch --progress origin && git push origin $gitTarget -f -u)
fi

popd
