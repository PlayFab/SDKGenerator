#!/bin/bash
# USAGE: testInit.sh

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

# Defaults for some variables
# CheckDefault SdkName UnitySDK
CheckDefault SHARED_WORKSPACE C:/depot
# CheckDefault WORKSPACE C:/proj

CheckVerticalizedParameters() {
    # Typical builds will meet none of these conditions, and this function will have no effect
    if [ -z "$GitDestBranch" ] || [ "$GitDestBranch" = "automated" ] || [ "$GitDestBranch" = "master" ] || [ "$GitDestBranch" = "versioned" ]; then
        echo "INVALID GitDestBranch: ($GitDestBranch, $VerticalName)"
        exit 1
    elif [ "$GitDestBranch" = "verticalName" ]; then
        if [ -z "$VerticalName" ] || [ "$VerticalName" = "automated" ] || [ "$VerticalName" = "master" ] || [ "$VerticalName" = "versioned" ]; then
            echo "INVALID GitDestBranch, can't be assigned to VerticalName: ($GitDestBranch, $VerticalName)"
            exit 1
        else
            # This is the expected-correct path for verticalized-builds
            GitDestBranch="automated-$VerticalName"
        fi
    fi
}

# USAGE: ResetRepo
ResetRepo (){
    # Assumes the current directory is set to the repo to be reset
    SetGitHubCreds
    git fetch --progress origin
    git checkout master || git checkout -b master || CleanCurrentRepo
    git pull origin master

    if [ "$GitDestBranch"!="master" ]; then
        git fetch --progress origin
        if [ "$PublishToGit"!="true" ]; then
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
