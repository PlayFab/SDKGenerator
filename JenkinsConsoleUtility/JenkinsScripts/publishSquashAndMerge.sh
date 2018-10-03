#!/bin/bash

# Squash and Merge from "automated-publish"->"master"->"versioned"
#   If versioned exists: master->versioned, and then tag and notate the release in GitHub

. "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh" || . ./util.sh

CheckDefault GitSrcBranch "automated-publish"

cd "$WORKSPACE/sdks/$SdkName"

git fetch --progress origin

echo === Sync $GitSrcBranch ===
git checkout $GitSrcBranch || git checkout -b $GitSrcBranch
git reset --hard origin/$GitSrcBranch
echo === Sync master ===
git checkout master || git checkout -b master
git reset --hard origin/master

echo === Squash-Merge to master ===
git merge --no-commit --squash origin/$GitSrcBranch
git commit -m "https://api.playfab.com/releaseNotes/#$sdkDate"
git push origin master

echo === Merge to versioned ===
cd "$WORKSPACE/sdks/$SdkName"
git checkout versioned || git checkout -b versioned
git reset --hard origin/versioned || exit 0

git merge --no-ff --no-commit origin/master
git commit -m "https://api.playfab.com/releaseNotes/#$sdkDate"
git push origin versioned

git tag $sdkVersion
git push --progress "origin" tag $sdkVersion

cd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
./JenkinsConsoleUtility.exe --version --GitApi -SdkName $SdkName -apiSpecPath

cd "$WORKSPACE/sdks/$SdkName"
git push origin --delete $GitSrcBranch
