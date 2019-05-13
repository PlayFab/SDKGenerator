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

#remove cruft from previous runs, if any.
rm -fdr "$RepoWorkingDirectory"
mkdir -p "$RepoWorkingDirectory/.."

#create the appcenter prebuild script in the xcode project
pushd "$XCodeWorkspaceDirectory"
touch appcenter-post-clone.sh
echo '#!/usr/bin/env bash

touch Gemfile

echo -e "source \"https://rubygems.org\"\n\ngem \"calabash-cucumber\", \">= 0.16\", \"< 2.0\"" > Gemfile

bundle ;
bundle exec calabash-ios download' > appcenter-post-clone.sh
popd

pushd "$RepoWorkingDirectory/.."

#clone the appcenter build repo to our local workspace
git clone -b $AppCenterGitRepoBranchName --single-branch "$AppCenterGitRepoURL"
cd $(basename "$AppCenterGitRepoURL")

#bring the repo back to a clean state
git fetch --tags 
git reset --hard $AppCenterGitRepoCleanTag
git push --force

#copy the xcode workspace into the appcenter git repo
cp -r "$XCodeWorkspaceDirectory" "$RepoWorkingDirectory/$ProjectFolderName"
git add .
git update-index --chmod=+x "$RepoWorkingDirectory/$ProjectFolderName/MapFileParser.sh"
git update-index --chmod=+x "$RepoWorkingDirectory/$ProjectFolderName/appcenter-post-clone.sh"
git commit -m "add xcode project for appcenter build"
git push

#queue the appcenter build
appcenter build queue --app "PlayFabSDKTeam/PlayFabUnityXCode" --branch $AppCenterGitRepoBranchName --quiet -d 

BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabUnityXCode" --quiet --output json)
BuildStatus="\"notStarted\""

#monitor the status of the build and wait until it is complete.
while [ "$BuildStatus" != "\"completed\"" ]
do 
sleep 10
BuildStatusJSON=$(appcenter build branches show -b $AppCenterGitRepoBranchName -a "PlayFabSDKTeam/PlayFabUnityXCode" --quiet --output json)
BuildStatus=$(echo "$BuildStatusJSON" | jq .status)
echo "Build Status: $BuildStatus"
done

#extract the results and build number
BuildResult=$(echo "$BuildStatusJSON" | jq .result)
BuildNumber=$(echo "$BuildStatusJSON" | jq .buildNumber | sed s/\"//g)

echo "Build $BuildNumber has $BuildResult."

#Download the build if successful, or print the logs if not.
if [ "$BuildResult" = "\"succeeded\"" ]; then
#Return the appcenter build repo to a clean state for next time.
git reset --hard $AppCenterGitRepoCleanTag
git push --force 
popd
appcenter build download --type build --app "PlayFabSDKTeam/PlayFabUnityXCode" --id $BuildNumber --file PlayFabIOS.ipa
else
popd
appcenter build logs --app "PlayFabSDKTeam/PlayFabUnityXCode" --id $BuildNumber
false
fi
