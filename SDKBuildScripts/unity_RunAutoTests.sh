#!/bin/bash

# USAGE: unity_RunAutoTests.bat [<UNITY_VERSION>] [<SdkName>] [<ProjRootPath>] [<BuildIdentifier>]
# Make folder links from the UnitySdk to this test project
# Requires mklink which may require administrator
# Requires the following environment variables:
#   TestWin32Build - (Optional - Default false if unset) set to "true" to test building Win32, executing, and geting Jenker! results
#   TestAndroid - (Optional - Default false if unset) set to "true" to build Android APK
#   TestiPhone - (Optional - Default false if unset) set to "true" to build iOS XCode project
#   TestWp8 - (Optional - Default false if unset) set to "true" to build Windows Universal 8 vs-sln
#   TestPS4 - (Optional - Default false if unset) set to "true" to build Sony PS4
#   TestSwitch - (Optional - Default false if unset) set to "true" to build Nintendo Switch
#   TestXbox - (Optional - Default false if unset) set to "true" to build Xbox One
#   BuildMainUnityPackage - (Optional - Default false if unset) set to "true" to build Unity Package for the SDK
#   UNITY_PUBLISH_VERSION - (Not required if $1 is defined) Versioned Unity executable name (Assumes multiple potential Unity installations, all in your PATH, each uniquely renamed)
#   EXECUTOR_NUMBER - (Not required if $4 is defined) Automatic Jenkins variable


if [ -z $1 ]; then
    UNITY_VERSION=$UNITY_PUBLISH_VERSION
else
    UNITY_VERSION=$1
fi
if [ -z $2 ]; then
    SdkName=UnitySDK
else
    SdkName=$2
fi
if [ -z "$3" ]; then
    ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
else
    ProjRootPath="$3"
fi
if [ -z $4 ]; then
    BuildIdentifier=JBuild_${SdkName}_${EXECUTOR_NUMBER}
else
    BuildIdentifier=$4
fi

CheckVars() {
    if [ -z "$TestWin32Build" ]; then
        TestWin32Build="false"
    fi
    if [ -z "$TestAndroid" ]; then
        TestAndroid="false"
    fi
    if [ -z "$TestiPhone" ]; then
        TestiPhone="false"
    fi
    if [ -z "$TestWp8" ]; then
        TestWp8="false"
    fi
    if [ -z "$TestPS4" ]; then
        TestPS4="false"
    fi
    if [ -z "$TestSwitch" ]; then
        TestSwitch="false"
    fi
    if [ -z "$TestXbox" ]; then
        TestXbox="false"
    fi
    if [ -z "$BuildMainUnityPackage" ]; then
        BuildMainUnityPackage="false"
    fi
}

SetProjDefines() {
    echo === Test compilation in all example projects ===

    # TC is used by essentially all of the test projects
    . ./unity_copyTestTitleData.sh "${ProjRootPath}/${SdkName}_TC/Assets/Resources" copy
    SetEachProjDefine ${SdkName}_TC
    # TODO: This is limiting the tests that get run on Jenkins...

    if [ "$BuildMainUnityPackage" = "true" ]; then
        SetEachProjDefine ${SdkName}_BUP
    fi

    SetEachProjDefine ${SdkName}_TA
    SetEachProjDefine ${SdkName}_TS
    SetEachProjDefine ${SdkName}_TZ
}

SetEachProjDefine() {
    pushd "${ProjRootPath}/$1"
    $UNITY_VERSION -projectPath "${ProjRootPath}/$1" -quit -batchmode -executeMethod SetupPlayFabExample.Setup -logFile "${ProjRootPath}/compile$1.txt" || (cat "${ProjRootPath}/compile$1.txt" && return 1)
    popd
}

JenkernaughtSaveCloudScriptResults() {
    echo === Save test results to Jenkernaught ===
    pushd "$WORKSPACE/SDKGenerator/JenkinsConsoleUtility/bin/Debug"
    cmd <<< "JenkinsConsoleUtility --listencs -buildIdentifier $BuildIdentifier -workspacePath $WORKSPACE -timeout 30 -verbose true"
    popd
}

RunClientJenkernaught() {
    if [ "$TestWin32Build" = "true" ]; then
        echo === Build Win32 Client Target ===
        pushd "${ProjRootPath}/${SdkName}_TC"
        $UNITY_VERSION -projectPath "${ProjRootPath}/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeWin32TestingBuild -logFile "${ProjRootPath}/buildWin32Client.txt" || (cat "${ProjRootPath}/buildWin32Client.txt" && return 1)
        popd

        echo === Run the $UNITY_VERSION Client UnitTests ===
        pushd "${ProjRootPath}/${SdkName}_TC/testBuilds"
        ls
        cmd <<< "Win32test.exe -batchmode -nographics -logFile \"${ProjRootPath}/clientTestOutput.txt\"" || (cat "${ProjRootPath}/clientTestOutput.txt" && return 1)
        popd

        JenkernaughtSaveCloudScriptResults
    fi
}

BuildClientByFunc() {
    if [ "$1" = "true" ]; then
        echo === Build $2 Target ===
        pushd "${ProjRootPath}/${SdkName}_TC"
        $UNITY_VERSION -projectPath "${ProjRootPath}/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.$2 -logFile "${ProjRootPath}/${2}.txt" || (cat "${ProjRootPath}/${2}.txt" && return 1)
        popd
        #Run the console test command if present
        if [ ! -z "$3" ]; then
            $3
        fi
    fi
}

ExecPs4OnConsole() {
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Consoles/ps4/unity_ps4.sh"
}

ExecSwitchOnConsole() {
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Consoles/switch/unity_switch.sh"
}

ExecXboxOnConsole() {
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Consoles/xbox/unity_xbox.sh"
}

TryBuildAndTestAndroid() {
    echo "TestAndroid: $TestAndroid"
    if [ "$TestAndroid" = "true" ]; then
        echo === Build and Test Android ===
        pushd "${ProjRootPath}/${SdkName}_TC"
            pushd "$WORKSPACE/SDKGenerator/SDKBuildScripts"
                ./unity_copyTestTitleData.sh "$WORKSPACE/sdks/UnitySDK/Testing/Resources" copy
            popd
            if [[ $? -ne 0 ]]; then return 1; fi
            
            $UNITY_VERSION -projectPath "$WORKSPACE/$UNITY_VERSION/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeAndroidBuild -logFile "$WORKSPACE/${SdkName}/buildPackageOutput.txt" || (cat "$WORKSPACE/${SdkName}/buildAndroidOutput.txt" && return 1)
            if [[ $? -ne 0 ]]; then return 1; fi
            
            pushd "$WORKSPACE/SDKGenerator/SDKBuildScripts"
                ./unity_copyTestTitleData.sh "$WORKSPACE/sdks/UnitySDK/Testing/Resources" delete
                if [[ $? -ne 0 ]]; then return 1; fi
                ./runAppCenterTest.sh "$ProjRootPath/${SdkName}_TC/testBuilds/PlayFabAndroid.apk" "$WORKSPACE/SDKGenerator/SDKBuildScripts/AppCenterUITestLauncher/AppCenterUITestLauncher/debugassemblies" android
                if [[ $? -ne 0 ]]; then return 1; fi
            popd

            JenkernaughtSaveCloudScriptResults
            if [[ $? -ne 0 ]]; then return 1; fi
        popd
    fi
}

TryBuildAndTestiOS() {
    echo "TestiPhone: $TestiPhone"
    if [ "$TestiPhone" = "true" ]; then
        echo === Build and Test iOS ===
        pushd "${ProjRootPath}/${SdkName}_TC"
            pushd "$WORKSPACE/SDKGenerator/SDKBuildScripts"
                ./unity_copyTestTitleData.sh "$WORKSPACE/sdks/UnitySDK/Testing/Resources" copy
            popd
            if [[ $? -ne 0 ]]; then return 1; fi
            
            $UNITY_VERSION -projectPath "$WORKSPACE/$UNITY_VERSION/${SdkName}_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeIPhoneBuild -logFile "$WORKSPACE/${SdkName}/buildPackageOutput.txt" || (cat "$WORKSPACE/${SdkName}/buildiPhoneOutput.txt" && return 1)
            if [[ $? -ne 0 ]]; then return 1; fi
            
            pushd "$WORKSPACE/SDKGenerator/SDKBuildScripts"
                ./unity_copyTestTitleData.sh "$WORKSPACE/sdks/UnitySDK/Testing/Resources" delete
                if [[ $? -ne 0 ]]; then return 1; fi

                ./unity_buildAppCenterTestIOS.sh "$ProjRootPath/${SdkName}_TC/testBuilds/PlayFabIOS" "$WORKSPACE/vso" 'git@ssh.dev.azure.com:v3/playfab/Playfab%20SDK%20Automation/UnitySDK_XCode_AppCenterBuild' $JOB_NAME init
                if [[ $? -ne 0 ]]; then return 1; fi

                ./runAppCenterTest.sh "$ProjRootPath/${SdkName}_TC/testBuilds/PlayFabAndroid.apk" "$WORKSPACE/SDKGenerator/SDKBuildScripts/AppCenterUITestLauncher/AppCenterUITestLauncher/debugassemblies" ios
                if [[ $? -ne 0 ]]; then return 1; fi
            popd

            JenkernaughtSaveCloudScriptResults
            if [[ $? -ne 0 ]]; then return 1; fi
        popd
    fi
}

BuildMainPackage() {
    if [ "$UNITY_PUBLISH_VERSION" = "$UNITY_VERSION" ] && [ "$BuildMainUnityPackage" = "true" ]; then
        echo === Build the asset bundle ===
        cd "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP"
        $UNITY_VERSION -projectPath "$WORKSPACE/$UNITY_VERSION/${SdkName}_BUP" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.PackagePlayFabSdk -logFile "$WORKSPACE/${SdkName}/buildPackageOutput.txt" || (cat "$WORKSPACE/${SdkName}/buildPackageOutput.txt" && return 1)
    fi
}

}
    cmd <<< "JenkinsConsoleUtility --kill -taskName $UNITY_VERSION"
EC() {
    if [ $1 -ne 0 ]; then return 1; else return 0; fi
}

DoWork() {
    CheckVars
    SetProjDefines
    RunClientJenkernaught
    TryBuildAndTestAndroid; AndroidResult=$?;
    TryBuildAndTestiOS; iOSResult=$?
    BuildClientByFunc "$TestWp8" "MakeWp8Build"; Wp8Result=$?
    BuildClientByFunc "$TestPS4" "MakePS4Build" "ExecPs4OnConsole"; PS4Result=$?
    BuildClientByFunc "$TestSwitch" "MakeSwitchBuild" "ExecSwitchOnConsole"; SwitchResult=$?
    BuildClientByFunc "$TestXbox" "MakeXboxOneBuild" "ExecXboxOnConsole"; XBoxResult=$?
    BuildMainPackage

    echo -e "Android Result:\t\t$(EM $AndroidResult)"
    echo -e "iOS Result:\t\t$(EM $iOSResult)"
    echo -e"Wp8 Result:\t\t$(EM $Wp8Result)"
    echo -e "PS4 Result:\t\t$(EM $PS4dResult)"
    echo -e "Switch Result:\t\t$(EM $SwitchResult)"
    echo -e "XBox Result:\t\t$(EM $XBoxResult)"

    KillUnityProcesses

    exit $(EC $(($AndroidResult + bg$iOSResult + $Wp8Result + $PS4Result + $SwitchResult + $XBoxResult)))
}

DoWork