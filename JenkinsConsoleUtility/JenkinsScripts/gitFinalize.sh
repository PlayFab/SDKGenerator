#!/bin/bash

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault PublishToGit false

ForcePushD "$WORKSPACE/sdks/$SdkName"

if [ $PublishToGit=="true" ]; then
    echo === Commit to Git ===
    git fetch --progress origin
    git add -A
    git commit --allow-empty -m "$commitMessage"
    git push origin $GitDestBranch -f -u || (git fetch --progress origin && git push origin $GitDestBranch -f -u)
fi

popd
