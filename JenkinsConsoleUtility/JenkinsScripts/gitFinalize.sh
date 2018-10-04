#!/bin/bash

. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" 2> /dev/null || . ./util.sh 2> /dev/null
. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/sdkUtil.sh" 2> /dev/null || . ./sdkUtil.sh 2> /dev/null

CheckDefault PublishToGit false

DoWork() {
    ForcePushD "$WORKSPACE/sdks/$SdkName"

    if [ $PublishToGit=="true" ]; then
        echo === Commit to Git ===
        git fetch --progress origin
        git add -A
        git commit --allow-empty -m "$commitMessage"
        git push origin $GitDestBranch -f -u || (git fetch --progress origin && git push origin $GitDestBranch -f -u)
    fi

    popd
}

CheckVerticalizedParameters
DoWork
