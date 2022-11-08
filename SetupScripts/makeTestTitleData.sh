#!/bin/bash
set -e

# MakeTestTitleDataFile testTitleStartDirectory devSecretKey aliasId
MakeTestTitleDataFile()
{
    if [ ! -d $1 ]
    then
        echo === testTitleData directory Not Detected ===
        echo ======== Creating ========
        mkdir $1
    fi

    pushd $1
    touch testTitleData.json
    echo "{
	\"titleId\": \"6195\",
	\"developerSecretKey\": \"$2\",
	\"aliasId\": \"$3\",
	\"userEmail\": \"a@b.com\",
	\"connectionString\": \"https://6195.playfabapi.com\"
}" > testTitleData.json
    popd
}
