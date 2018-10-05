#!/bin/bash
# USAGE: testInit.sh

. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" 2> /dev/null || . ./util.sh 2> /dev/null
. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/sdkUtil.sh" 2> /dev/null || . ./sdkUtil.sh 2> /dev/null

# USAGE: ResetRepo
ResetRepo (){
    # Assumes the current directory is set to the repo to be reset
    SetGitHubCreds
    git fetch --progress origin
    git checkout master || git checkout -b master || CleanCurrentRepo
    git pull origin master

    if [ "$GitDestBranch"!="master" ]; then
        git fetch --progress origin
        if [ "$GitDestBranch" != "doNotCommit" ]; then
            git branch -D $GitDestBranch || true
            git checkout -b $GitDestBranch
        else
            git checkout -b $GitDestBranch
            git checkout $GitDestBranch
        fi
    fi
}

CheckVerticalizedParameters
ForcePushD "$WORKSPACE/sdks/$SdkName"
ResetRepo
