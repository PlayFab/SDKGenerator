#!/bin/sh
# USAGE: unity_copyTestTitleData.sh <target directory to contain testTitleData.json inside of the unity project>
# Copies the actively configured test title data into the unity project.

#PREREQUISITES:
# Caller must have their testTitleData.json path configured in the PF_TEST_TITLE_DATA_JSON env var.

TestTitleData=$(printenv PF_TEST_TITLE_DATA_JSON)
TargetPath=$1

mkdir -p "$TargetPath"
cp "$TestTitleData" "$TargetPath/testTitleData.json"
