#!/bin/bash
usage="./BuildAndRunTestsMacOS.sh <target ipa directory path> <path to project>"

archivePath=$1
projectPath=$2

#verify inputs
if [ "$#" -ne 2 ]; then 
    echo $usage
    exit 1
fi

#be safe and clean up old archives
rm -fdr $archivePath/macOS

#inject the testTitleData into the project prior to build
cp $PF_TEST_TITLE_DATA_JSON $projectPath/Content/TestTitleData

#build the archive
. ./BuildMacOS.sh $archivePath $projectPath
buildResult=$?

#remove the testTitleData from the project now that the build is finished
rm -f $projectPath/Content/TestTitleData/testTitleData.json

#exit if the build failed
if [ $buildResult -ne 0 ]; then 
    echo "BUILD FAILED!"
    exit 1
fi

cd $archivePath/macOS

# TODO: RUN THE TESTS
#remove a preexisting payload folder from a prior unzip if it exists (it really shouldn't tho)
#rm -fdr Payload

#unzip the ipa archive in preparation of deployment
#unzip ExampleProject.ipa

#deploy the project (todo: add support for multiple test devices)
#ios-deploy -b  Payload/ExampleProject.app -I -r

#self termination of the app tells ios-deploy that there was a failure.  this failure must be ignored.  we rely on cloudscript to validate test results.
exit 0

