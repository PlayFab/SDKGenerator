#!/bin/bash
#USAGE: xplat_buildAppCenterTestIOS.sh 
#           <path to the root of the xplatcppsdk repo to be built> 
#           <path to local appcenter test working copy folder> 
#           <git clone url for the appcenter build>
#           <git branch name for the appcenter build repo>
#           <git tag name for the clean branch state>
#           <path to test xamarin.uitest assemblies that will be uploaded to appcenter>

#PREREQUISITES:
#1) System must be provisioned with login-free write access to the appcener build git repository.
#2) System must have jq installed (https://stedolan.github.io/jq)
#3) System must have the appcenter cli installed
#4) System must have AppCenter API Credentials configured and installed: (https://docs.microsoft.com/en-us/appcenter/cli/index) using the APPCENTER_ACCESS_TOKEN envvar

#INPUTS
XPlatWorkspaceDirectory=$1
AppCenterRepoParentDir=$2
AppCenterGitRepoURL=$3
AppCenterGitRepoBranchName=$4
AppCenterGitRepoCleanTag=$5
AppCenterTestAssembliesPath=$6

echo $XPlatWorkspaceDirectory
echo $AppCenterRepoParentDir
echo $AppCenterGitRepoURL
echo $AppCenterGitRepoBranchName
echo $AppCenterGitRepoCleanTag

#DERIVED FROM INPUTS
ProjectFolderName=$(basename "$XPlatWorkspaceDirectory")
GitRepoFolderName=$(basename "$AppCenterGitRepoURL" | sed -e 's/.git//g')

echo "Project Folder Name: $ProjectFolderName"
echo "Git Folder Name: $GitRepoFolderName"

#remove cruft from previous runs, if any.
InitializeBuildEnvironment() {
    rm -fdr "$AppCenterRepoParentDir/$GitRepoFolderName"
    mkdir -p "$AppCenterRepoParentDir/$GitRepoFolderName"

    pushd "$AppCenterRepoParentDir"

    echo "about to clone appcenter build rpo into: $AppCenterRepoParentDir/$GitRepoFolderName"

    #clone the appcenter build repo to our local workspace
    NewBranch=0
    git clone "$AppCenterGitRepoURL"
    cd $GitRepoFolderName 
    echo "Fetching tags and resetting at $PWD"
    git fetch --tags 
    git reset --hard $AppCenterGitRepoCleanTag
    git push --force
    git stash --all
    git stash clear

    echo "About to checkout $AppCenterGitRepoBranchName..."

    git checkout "$AppCenterGitRepoBranchName" || NewBranch=1
    if [ $NewBranch -ne 0 ]; then
        echo "Failed to checkout existing branch: $AppCenterGitRepoBranchName. Creating as new branch."
        git checkout -b "$AppCenterGitRepoBranchName"
    else 
        git reset --hard init
        git stash --all 
        git stash clear
        git push --force
    fi

    #copy the xcode workspace into the appcenter git repo
    ACB="$AppCenterRepoParentDir/$GitRepoFolderName"
    pushd "$XPlatWorkspaceDirectory" 
    echo "Copying project contents from $PWD into $ACB..."
    cp -rf test "$ACB"
    cp -rf code "$ACB"
    cp -rf external "$ACB"
    mkdir "$ACB/build" || true
    cp -rf build/iOS "$ACB/build"
    echo "Loading test title data from $PF_TEST_TITLE_DATA_JSON into $ACB/build/iOS/TestIOSApp/TestTitleData..."
    cp "$PF_TEST_TITLE_DATA_JSON" "$ACB/build/iOS/TestIOSApp/TestTitleData"
    popd #$XPlatWorkspaceDirectory

    #create the appcenter prebuild script in the xcode project
    pushd "$ACB/build/iOS"
   
    rm -f appcenter-post-clone.sh
    echo -e '#!/usr/bin/env bash

    pushd TestIOSApp

    touch Gemfile

    echo -e "source \"https://rubygems.org\"\n\ngem \"calabash-cucumber\", \">= 0.16\", \"< 2.0\"" > Gemfile

    bundle ;
    bundle exec calabash-ios download

    popd' >> appcenter-post-clone.sh

    popd #$ACB/build/iOS

    pushd "$ACB"
    git add .
    git update-index --chmod=+x "$ACB/build/iOS/appcenter-post-clone.sh"
    git commit -m "add xcode project for appcenter build"

    #if a new branch was created AppCenter needs to be manually configured for this branch.  
    if [ $NewBranch -eq 1 ]; then
        git push -u origin "$AppCenterGitRepoBranchName"
        echo 'ERROR: Unity Job '"$AppCenterGitRepoBranchName"' did not yet exist.'
        echo "The branch has been created and populated, but must be manually configured in AppCenter."
        echo "Please try again once the AppCenter build branch has been properly configured."
        exit 1
    fi

    git push
}

#queue the appcenter build
QueueAppCenterBuild() {
    appcenter build queue --app "PlayFabSDKTeam/PlayFabXPlatIOS" --branch $AppCenterGitRepoBranchName --quiet -d 
    if [ $? -ne 0 ]; then
        echo "Error queueing build!"
        exit 1
    fi

    BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabXPlatIOS" --quiet --output json)
    BuildStatus="\"notStarted\""
}

#monitor the status of the build and wait until it is complete.
WaitForAppCenterBuild() {
    for i in {1..30}
    do
        sleep 60
        BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabXPlatIOS" --quiet --output json)
        BuildStatus=$(echo "$BuildStatusJSON" | jq .status)
        echo "WaitForAppCenterBuild check number: $i, Build Status: $BuildStatus"
        if [ "$BuildStatus" = "\"completed\"" ]; then
            return 0
        fi
    done
    
    exit 1
}

ExtractBuildResults() {
    #extract the results and build number
    BuildResult=$(echo "$BuildStatusJSON" | jq .result)
    BuildNumber=$(echo "$BuildStatusJSON" | jq .buildNumber | sed s/\"//g)

    echo "Build $BuildNumber has $BuildResult."
}

#Download the build if successful, or print the logs if not.
DownloadIpa() {
    if [[ $BuildResult == *"Succeeded"* ]]; then
        appcenter build download --type build --app "PlayFabSDKTeam/PlayFabXPlatIOS" --id $BuildNumber --file PlayFabIOS.ipa
    else
        appcenter build logs --app "PlayFabSDKTeam/PlayFabXPlatIOS" --id $BuildNumber >> "build_logs_${BuildNumber}.txt"
        exit 1
    fi
}

RunAppCenterTest() {
    appcenter test run uitest --app "PlayFabSDKTeam/PlayFabXPlatIOS" \
    --devices 3d1d91de \
    --app-path PlayFabIOS.ipa  \
    --test-series "master" \
    --locale "en_US" \
    --assembly-dir "$AppCenterTestAssembliesPath"  \
    --uitest-tools-dir "$XAMARIN_UITEST_TOOLS"
}

CleanUp() {
    pushd "$AppCenterRepoParentDir/$GitRepoFolderName"
    #Return the appcenter build repo to a clean state for next time.
    git reset --hard $AppCenterGitRepoCleanTag
    git push --force 
    popd
}

DoWork() {
    InitializeBuildEnvironment
    QueueAppCenterBuild
    WaitForAppCenterBuild
    ExtractBuildResults
    DownloadIpa
    RunAppCenterTest
    CleanUp
}

DoWork
