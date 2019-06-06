#!/bin/bash
usage="./BuildAndRunTestsIOS.sh <target ipa directory path> <path to project>"

archivePath=$1
projectPath=$2

if [ "$#" -ne 2 ]; then 
    echo $usage
    exit 1
fi

cp $(PF_TEST_TITLE_DATA_JSON) $projectPath/Content/TestTitleData

./BuildIOS.sh $archivePath $projectPath

pushd $archivePath/IOS
unzip ExampleProject.ipa
ios-deploy -b  Payload/ExampleProject.app -I -r
popd

