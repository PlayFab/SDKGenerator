#!/bin/bash
# USAGE: testInit.sh

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

# Defaults for some variables
CheckDefault AUTOMATED_GIT_BRANCH automated
CheckDefault gitTarget $AUTOMATED_GIT_BRANCH
CheckDefault SdkName UnitySDK
CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault WORKSPACE C:/proj

# USAGE: ResetRepo
ResetRepo (){
    # Assumes the current directory is set to the repo to be reset
    SetGitHubCreds
    git checkout master
    git pull origin master

    if [ "$gitTarget"!="master" ]; then
        if [ "$PublishToGit"!="true" ]; then
            git branch -D $gitTarget || true
            git checkout -b $gitTarget
            git push origin $gitTarget -f -u
        else
            git checkout -b $gitTarget
            git checkout $gitTarget
        fi
    fi
}

ForcePushD "$WORKSPACE/sdks/$SdkName"
ResetRepo
