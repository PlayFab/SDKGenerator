#!/bin/bash

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault PublishToGit false

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
