#!/bin/bash
set -e

# USAGE: unity_RunAutoTests.sh [<UNITY_VERSION>] [<SdkName>]
# Make folder links from the UnitySdk to this test project
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

if [ -f "util.sh" ]; then
    . "./util.sh" 2> /dev/null
    . "./acUtil.sh" 2> /dev/null
    . "./sdkUtil.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Pipeline/util.sh" 2> /dev/null
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Pipeline/acUtil.sh" 2> /dev/null
    . "$WORKSPACE/JenkinsSdkSetupScripts/JenkinsScripts/Pipeline/sdkUtil.sh" 2> /dev/null
fi

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

RepoProject="${WORKSPACE}/sdks/${SdkName}/ExampleTestProject"
ProjRootPath="${WORKSPACE}/${UNITY_VERSION}"
CheckBuildIdentifierDefault

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
    if [ -z "$TestCompileFlags" ]; then
        TestCompileFlags="true"
    fi
    if [ -z "$BuildMainUnityPackage" ]; then
        BuildMainUnityPackage="false"
    fi
}

SetProjDefines() {
    if [ "$TestCompileFlags" = "true" ]; then
        echo === Test compilation in all example projects ===

        SetEachProjDefine ${SdkName}_TA
        SetEachProjDefine ${SdkName}_TS
        SetEachProjDefine ${SdkName}_TZ
    else
        echo "  -- Skipped TA/TS/TZ compilation test because TestCompileFlags was $TestCompileFlags --"
    fi
}

SetEachProjDefine() {
    echo === Set $1 Proj Define ===
    pushd "${ProjRootPath}/$1"
    tempLogPath="${WORKSPACE}/logs/compile$1.txt"
    $UNITY_VERSION -projectPath "${ProjRootPath}/$1" -quit -batchmode -executeMethod SetupPlayFabExample.Setup -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"
    popd
}

PrintTestLog() {
    cat "$1"
    return 1
}

RunClientJenkernaught() {
    if [ "$TestWin32Build" = "true" ]; then
        echo === Build Win32 Client Target ===
        pushd "${RepoProject}"
            tempLogPath="${WORKSPACE}/logs/buildWin32Client.txt"
            $UNITY_VERSION -projectPath "${RepoProject}" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeWin32TestingBuild -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"
            if [ ! -d "${WORKSPACE}/testBuilds" ]; then
                echo "${WORKSPACE}/testBuilds output dir not created"
                PrintTestLog "$tempLogPath"
                return 1
            fi
        popd

        echo === Run the $UNITY_VERSION Client UnitTests ===
        pushd "${WORKSPACE}/testBuilds"
            tempLogPath="${WORKSPACE}/logs/clientTestOutput.txt"
            cmd <<< "Win32test.exe -batchmode -nographics -logFile \"$tempLogPath\" || exit 1" || PrintTestLog "$tempLogPath"
        popd

        echo === Save test results to Jenkernaught ===
        ListenCsJCU
    else
        echo "  -- Skipped Win32test.exe Build/Run because TestWin32Build was $TestWin32Build --"
    fi
}

BuildClientByFunc() {
    testIsFunc=$(type -t $3) || testIsFunc=none

    if [ "$1" = "true" ] && [ "$testIsFunc" = "function" ]; then
        # If the $1 test condition is active, and $3 is the name of a function...
        echo === Build $2 Target ===
        pushd "${RepoProject}"
        tempLogPath="${WORKSPACE}/logs/${2}.txt"
        $UNITY_VERSION -projectPath "${RepoProject}" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.$2 -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"
        popd
        #Run the console test command if present
        $3
    elif [ "$1" = "true" ]; then
        # If the $1 test condition is active, but $3 doesn't define a function...
        echo "  -- Skipped $2 Target, Error: function does not exist: $testIsFunc --"
        return 1
    else
        echo "  -- Skipped $2 Target --"
    fi
}

ExecUnityXboxOnConsole() {
    . "${WORKSPACE}/JenkinsSdkSetupScripts/JenkinsScripts/Consoles/xbox/unity_xbox.sh"
}

TryBuildAndTestAndroid() {
    echo "TestAndroid: $TestAndroid"
    . ./unity_copyTestTitleData.sh
    if [ "$TestAndroid" = "true" ]; then
        echo === Build and Test Android ===
        pushd "${RepoProject}"
            #copy test title data in
            CopyTestTitleDataToUnity

            #build the APK
            tempLogPath="${WORKSPACE}/logs/buildAndroidOutput.txt"
            $UNITY_VERSION -projectPath "${RepoProject}" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeAndroidBuild -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"

            pushd "${WORKSPACE}/JenkinsSdkSetupScripts/JenkinsScripts/Pipeline"
                #pull the test title data back out
                DeleteTestTitleDataFromUnity

                #upload the APK and run the tests on AppCenter Test
                . ./runAppCenterTest.sh "${WORKSPACE}/testBuilds/PlayFabAndroid.apk" "${WORKSPACE}/SDKGenerator/SDKBuildScripts/AppCenterUITestLauncher/AppCenterUITestLauncher/debugassemblies" unity-android || exit 1

            popd

            #check the cloudscript for the test results
            ListenCsJCU

        popd
    else
        echo "  -- Skipped Android Build/Run because TestAndroid was $TestAndroid --"
    fi
}

TryBuildAndTestiOS() {
    echo "TestiPhone: $TestiPhone"
    . ./unity_copyTestTitleData.sh
    if [ "$TestiPhone" = "true" ]; then
        echo === Build and Test iOS ===

        pushd "${RepoProject}"
            #copy the test title data in
            CopyTestTitleDataToUnity

            #build the xcode project to prepare for IPA generation
            tempLogPath="${WORKSPACE}/logs/buildPackageOutput.txt"
            $UNITY_VERSION -projectPath "${RepoProject}" -quit -batchmode -appcenter -executeMethod PlayFab.Internal.PlayFabPackager.MakeIPhoneBuild -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"

            pushd "${WORKSPACE}/JenkinsSdkSetupScripts/JenkinsScripts/Pipeline"
                #pull the test title data back out.
                DeleteTestTitleDataFromUnity

                #build the IPA on AppCenter Build
                . ./unity_buildAppCenterTestIOS.sh "${WORKSPACE}/testBuilds/PlayFabIOS" "${WORKSPACE}/vso" 'git@ssh.dev.azure.com:v3/playfab/Playfab%20SDK%20Automation/UnitySDK_XCode_AppCenterBuild' ${SdkName}_${NODE_NAME}_${EXECUTOR_NUMBER} init || exit 1

                #run the downloaded IPA on AppCenter Test
                . ./runAppCenterTest.sh "${WORKSPACE}/vso/UnitySDK_XCode_AppCenterBuild/PlayFabIOS.ipa" "${WORKSPACE}/SDKGenerator/SDKBuildScripts/AppCenterUITestLauncher/AppCenterUITestLauncher/debugassemblies" unity-ios || exit 1

            popd

            #check the cloudscript for the test results
            ListenCsJCU

        popd
    else
        echo "  -- Skipped iPhone Build/Run because TestiPhone was $TestiPhone --"
    fi
}

BuildPackages() {
    if [ "$UNITY_PUBLISH_VERSION" = "$UNITY_VERSION" ] && [ "$BuildMainUnityPackage" = "true" ]; then
        echo === Build the SDK asset bundle ===
        cd "$RepoProject"
        tempLogPath="${WORKSPACE}/logs/buildPackageOutput.txt"
        $UNITY_VERSION -projectPath "$RepoProject" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.PackagePlayFabSdk -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"
        echo === Build the EdEx asset bundle ===
        cd "$RepoProject"
        tempLogPath="${WORKSPACE}/logs/buildEdExOutput.txt"
        $UNITY_VERSION -projectPath "$RepoProject" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabEdExPackager.BuildUnityPackage -logFile "$tempLogPath" || PrintTestLog "$tempLogPath"
    else
        echo "  -- Skipped BuildMainUnityPackage because: BuildMainUnityPackage was $BuildMainUnityPackage and/or UNITY_PUBLISH_VERSION != $UNITY_VERSION--"
    fi
}

#pretty-print test a test result codes (if the test was actually run)
EM() {
    if [ "$2" != "true" ]; then echo "N/A"
    elif [ $1 -ne 0 ]; then echo FAIL
    else echo PASS
    fi
}

#boil error codes down to either 1 or 0.
EC() {
    if [ $1 -ne 0 ]; then return 1; else return 0; fi
}

DoWork() {
    . ./unity_copyTestTitleData.sh
    CopyTestTitleDataToUnity

    CheckVars
    SetProjDefines
    RunClientJenkernaught
    TryBuildAndTestAndroid; AndroidResult=$?;
    TryBuildAndTestiOS; iOSResult=$?
    BuildClientByFunc "$TestWp8" "MakeWp8Build"; Wp8Result=$?
    # ExecUnityPs4OnConsole will only be defined on the Unity PS4 pipeline
    BuildClientByFunc "$TestPS4" "MakePS4Build" "ExecUnityPs4OnConsole"; PS4Result=$?
    BuildClientByFunc "$TestSwitch" "MakeSwitchBuild" "ExecUnitySwitchOnConsole"; SwitchResult=$?
    BuildClientByFunc "$TestXbox" "MakeXboxOneBuild" "ExecUnityXboxOnConsole"; XBoxResult=$?
    BuildPackages

    #show us how it all went
    echo "Android Result:\t$(EM $AndroidResult $TestAndroid)"
    echo "iOS Result:\t\t$(EM $iOSResult $TestiPhone)"
    echo "Wp8 Result:\t\t$(EM $Wp8Result $TestWp8)"
    echo "PS4 Result:\t\t$(EM $PS4Result $TestPS4)"
    echo "Switch Result:\t\t$(EM $SwitchResult $TestSwitch)"
    echo "XBox Result:\t\t$(EM $XBoxResult $TestXbox)"

    CallJCU --kill -taskName $UNITY_VERSION

    #trigger a jenkins job failure if it didn't go well
    exit $(EC $(($AndroidResult + $iOSResult + $Wp8Result + $PS4Result + $SwitchResult + $XBoxResult)))
}

DoWork
