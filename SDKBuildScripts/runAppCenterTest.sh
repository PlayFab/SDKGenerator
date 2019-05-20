#!/bin/sh
# USAGE: runAppCenterTest.sh <path to apk> <path to test tools assemblies> <target platform: ios | android>
# Uploads an android apk or iOS ipa of the playfab test app to appcenter and then runs the test app 

#PREREQUISITES:
#1. Caller must have the Microsoft AppCenter CLI installed (https://github.com/Microsoft/appcenter-cli)
#2. Caller must have API Credentials configured and installed: (https://docs.microsoft.com/en-us/appcenter/cli/index) using the APPCENTER_ACCESS_TOKEN envvar
#3. Caller must have the path to the Xamarin.UITest tools cloud-test.ext configured in the XAMARIN_UITEST_TOOLS envvar

AppApk=$1
TestsPath=$2
TestToolsPath=$(printenv XAMARIN_UITEST_TOOLS)
AppCenterCLIPath=$(printenv APPCENTER_CLI_PATH)
Platform=$3

Usage="Usage: ./runAppCenterTest.sh <path to apk to test> <path to xamarin.uitest test assemblies> <target platform: ios | android>"


#check number of args
if [ "$#" -ne 3 ]; then 
echo $Usage
exit
fi

if [ "$Platform" = "ios" ]; then 
Devices=a1bf2de1
AppCenterApp="PlayFabSDKTeam/PlayFabUnityXCode"
elif [ "$Platform" = "android" ]; then
AppCenterApp="PlayFabSDKTeam/PlayFabUnityAndroid"
Devices=f749a00a
else #invalid platform
echo "Error: invalid platform entry!"
echo $Usage
fi

echo "=== Starting AppCenter Test Run with Params: ==="
echo "$AppApk"
echo "$TestsPath"
echo "$TestToolsPath"
echo "$AppCenterCLIPath"

pushd "$AppCenterCLIPath"

#execute the appcenter test run
./appcenter test run uitest \
--app "$AppCenterApp" \
--devices $Devices \
--app-path "$AppApk" \
--test-series "master" \
--locale "en_US" \
--build-dir "$TestsPath" \
--uitest-tools-dir "$TestToolsPath"

popd
