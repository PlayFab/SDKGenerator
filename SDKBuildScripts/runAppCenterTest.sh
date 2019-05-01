#!/bin/sh

#PREREQUISITES:
#1. Caller must have the Microsoft AppCenter CLI installed (https://github.com/Microsoft/appcenter-cli)
#2. Caller must have API Credentials configured and installed: (https://docs.microsoft.com/en-us/appcenter/cli/index) using the APPCENTER_ACCESS_TOKEN envvar
#3. Caller must have the path to the Xamarin.UITest tools cloud-test.ext configured in the XAMARIN_UITEST_TOOLS envvar

AppApk=$1
TestsPath=$2
TestToolsPath=$(printenv XAMARIN_UITEST_TOOLS)
AppCenterCLIPath=$(printenv APPCENTER_CLI_PATH)


#check number of args
if [ "$#" -ne 2 ]; then 
echo "Usage: ./testAndroidWithAppCenter <path to apk to test> <path to xamarin.uitest test assemblies>"
exit
fi

echo "=== Starting AppCenter Test Run with Params: ==="
echo "$AppApk"
echo "$TestsPath"
echo "$TestToolsPath"
echo "$AppCenterCLIPath"

pushd "$AppCenterCLIPath"

#execute the appcenter test run
./appcenter test run uitest \
--app "PlayFabSDKTeam/PlayFabUnityAndroid" \
--devices f749a00a \
--app-path "$AppApk" \
--test-series "master" \
--locale "en_US" \
--build-dir "$TestsPath" \
--uitest-tools-dir "$TestToolsPath"

popd
