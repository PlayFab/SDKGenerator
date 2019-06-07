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

buildResult=$?

rm -f $projectPath/Content/TestTitleData/testTitleData.json

if [ $buildResult -ne 0 ]; then 
    echo "BUILD FAILED!"
    exit 1
fi

cd $archivePath/IOS

unzip ExampleProject.ipa

ios-deploy -b  Payload/ExampleProject.app -I -r

deployResult=$?

if[ $deployResult -ne 0 ]; then
    echo "DEPLOY FAILED!" 
    exit 1
fi

