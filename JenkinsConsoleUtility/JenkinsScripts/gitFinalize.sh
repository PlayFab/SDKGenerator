#!/bin/bash

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

CheckDefault gitTarget $AUTOMATED_GIT_BRANCH
CheckDefault WORKSPACE C:/proj
CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault SdkName UnitySDK
CheckDefault PublishToGit false

if [ $PublishToGit=="false" ]; then
    echo === Revert files (do not commit this version) ===
    ForceCD $SHARED_WORKSPACE\sdks\$SdkName
    git checkout -- .
else
    echo === Commit to Git ===
    ForceCD $WORKSPACE\sdks\$SdkName
    git add -A
    git commit -m "$commitMessage"
    git push origin $gitTarget
    ForceCD $SHARED_WORKSPACE\sdks\$SdkName
    git push origin $gitTarget
fi
