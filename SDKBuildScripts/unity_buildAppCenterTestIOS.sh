#!/bin/bash
#USAGE: unity_buildAppCenterTestIOS.sh 
#           <path to xcode workspace folder to be built> 
#           <path to local appcenter test working copy folder> 
#           <git clone url for the appcenter build>
#           <git branch name for the appcenter build repo>
#           <git tag name for the clean branch state>

#PREREQUISITES:
#1) System must be provisioned with login-free write access to the appcener build git repository.
#2) System must have jq installed (https://stedolan.github.io/jq)
#3) System must have the appcenter cli installed
#4) System must have AppCenter API Credentials configured and installed: (https://docs.microsoft.com/en-us/appcenter/cli/index) using the APPCENTER_ACCESS_TOKEN envvar

#INPUTS
XCodeWorkspaceDirectory=$1
RepoWorkingDirectory=$2
AppCenterGitRepoURL=$3
AppCenterGitRepoBranchName=$4
AppCenterGitRepoCleanTag=$5

#DERIVED FROM INPUTS
ProjectFolderName=$(basename "$XCodeWorkspaceDirectory")
GitRepoFolderName=$(basename "$AppCenterGitRepoURL" | sed -e 's/.git//g')

#remove cruft from previous runs, if any.
InitializeBuildEnvironment() {
    rm -fdr "$RepoWorkingDirectory/$GitRepoFolderName"
    mkdir -p "$RepoWorkingDirectory/$GitRepoFolderName"

    #create the appcenter prebuild script in the xcode project
    pushd "$XCodeWorkspaceDirectory"
    touch appcenter-post-clone.sh
    echo '#!/usr/bin/env bash

    touch Gemfile

    echo -e "source \"https://rubygems.org\"\n\ngem \"calabash-cucumber\", \">= 0.16\", \"< 2.0\"" > Gemfile

    bundle ;
    bundle exec calabash-ios download' > appcenter-post-clone.sh
    popd

    pushd "$RepoWorkingDirectory"

    #clone the appcenter build repo to our local workspace
    NewBranch=0
    git clone "$AppCenterGitRepoURL"
    cd $(basename "$AppCenterGitRepoURL" | sed -e 's/.git//g')
    git fetch --tags 
    git reset --hard $AppCenterGitRepoCleanTag
    git push --force

    git checkout "$AppCenterGitRepoBranchName"
    if [ $? -ne 0 ]; then
        echo "Failed to checkout existing branch: $AppCenterGitRepoBranchName. Creating as new branch."
        git checkout -b "$AppCenterGitRepoBranchName"
        NewBranch=1
    fi

    #copy the xcode workspace into the appcenter git repo
    cp -r "$XCodeWorkspaceDirectory" "$RepoWorkingDirectory/$GitRepoFolderName"
    git add .
    git update-index --chmod=+x "$RepoWorkingDirectory/$GitRepoFolderName/$ProjectFolderName/MapFileParser.sh"
    git update-index --chmod=+x "$RepoWorkingDirectory/$GitRepoFolderName/$ProjectFolderName/appcenter-post-clone.sh"
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
    appcenter build queue --app "PlayFabSDKTeam/PlayFabUnityXCode" --branch $AppCenterGitRepoBranchName --quiet -d 
    if [ $? -ne 0 ]; then
        echo "Error queueing build!"
        exit 1
    fi

    BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabUnityXCode" --quiet --output json)
    BuildStatus="\"notStarted\""
}

#monitor the status of the build and wait until it is complete.
WaitForAppCenterBuild() {
    for i in {1..60}
    do
        sleep 60
        BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabUnityXCode" --quiet --output json)
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
CleanupAndDownloadIpa() {
    if [ "$BuildResult" = "\"succeeded\"" ]; then
        #Return the appcenter build repo to a clean state for next time.
        git reset --hard $AppCenterGitRepoCleanTag
        git push --force 
        popd
        RetryLoop appcenter build download --type build --app "PlayFabSDKTeam/PlayFabUnityXCode" --id $BuildNumber --file PlayFabIOS.ipa
    else
        popd
        appcenter build logs --app "PlayFabSDKTeam/PlayFabUnityXCode" --id $BuildNumber
        exit 1
    fi
}

DoWork() {
    InitializeBuildEnvironment
    QueueAppCenterBuild
    WaitForAppCenterBuild
    ExtractBuildResults
    CleanupAndDownloadIpa
}

DoWork
