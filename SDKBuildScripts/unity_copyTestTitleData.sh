#!/bin/sh

TestTitleData=$(printenv PF_TEST_TITLE_DATA_JSON)
TargetPath=$1

mkdir -p "$TargetPath"
cp "$TestTitleData" "$TargetPath/testTitleData.json"
