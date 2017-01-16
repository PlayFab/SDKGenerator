#!/bin/bash
# USAGE: unity_SetupTestProjects.bat [<SdkRepoName>] [<SdkFilePath>] [<DestinationPath>]
# Make folder links from the UnitySdk to this test project
# Requires mklink which may require administrator

# USAGE: forceCD <path>
forceCD () {
    #set -x
    dirs -c
    if [ -z "$@" ]; then
        return 1
    fi
    cd "$@" 2> /dev/null
    if [ $? -ne 0 ]; then
        mkdir -p "$@"
        cd "$@"
    fi
    #set +x
    return 0
}

# USAGE: forcePushD <path>
forcePushD () {
    #set -x
    if [ -z "$@" ]; then
        return 1
    fi
    pushd "$@" 2> /dev/null
    if [ $? -ne 0 ]; then
        mkdir -p "$@"
        pushd "$@"
    fi
    #set +x
    return 0
}

# USAGE: deleteCruft
deleteCruft () {
    rmdir /S /Q .vs 2> /dev/null
    rmdir /S /Q bin 2> /dev/null
    rmdir /S /Q Library 2> /dev/null
    rmdir /S /Q obj 2> /dev/null
    rmdir /S /Q ProjectSettings 2> /dev/null
    rmdir /S /Q Temp 2> /dev/null
    rmdir /S /Q testBuilds 2> /dev/null
    mkdir testBuilds
    rm -f *.csproj 2> /dev/null
    rm -f *.sln 2> /dev/null
}


# USAGE: doWorkEditor <ProjectSubfolder> <UnityDefineSymbols>
doWorkEditor () {
    forcePushD "$1"
    deleteCruft
    forcePushD "Assets"
    cmd <<< "rmdir PlayFabSdk >nul 2>&1"
    cmd <<< "mklink /D PlayFabSdk \"${SdkPath}\Source\PlayFabSDK\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Plugins >nul 2>&1"
    cmd <<< "mklink /D Plugins \"${SdkPath}\Source\Plugins\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Editor >nul 2>&1"
    cmd <<< "mklink /D Editor \"${SdkPath}/Testing/Editor\""
    if [ $? -ne 0 ]; then return 1; fi
    writeUnitySettingsFile "PlayFabExample/Editor" "$2"
    #set -x
    popd
    popd
    #set +x
}

# USAGE: doWorkTesting <ProjectSubfolder> <UnityDefineSymbols>
doWorkTesting () {
    forcePushD "$1"
    deleteCruft
    forcePushD "Assets"
    cmd <<< "rmdir PlayFabSdk >nul 2>&1"
    cmd <<< "mklink /D PlayFabSdk \"${SdkPath}\Source\PlayFabSDK\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Plugins >nul 2>&1"
    cmd <<< "mklink /D Plugins \"${SdkPath}\Source\Plugins\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Testing >nul 2>&1"
    cmd <<< "mklink /D Testing \"${SdkPath}\Testing\""
    if [ $? -ne 0 ]; then return 1; fi
    writeUnitySettingsFile "PlayFabExample\Editor" "$2"
    #set -x
    popd
    popd
    #set +x
}

# USAGE: writeUnitySettingsFile <DestinationSubfolder> <UnityDefineSymbols>
writeUnitySettingsFile () {
    forcePushD "$1"
    rm -f SetupPlayFabExample.cs
    echo "using System;" >> SetupPlayFabExample.cs
    echo "using UnityEditor;" >> SetupPlayFabExample.cs
    echo "using UnityEngine;" >> SetupPlayFabExample.cs
    echo "public static class SetupPlayFabExample" >> SetupPlayFabExample.cs
    echo "{" >> SetupPlayFabExample.cs
    echo "    [MenuItem(\"PlayFab/Testing/SetupDefines\")]" >> SetupPlayFabExample.cs
    echo "    public static void Setup()" >> SetupPlayFabExample.cs
    echo "    {" >> SetupPlayFabExample.cs
    echo "        foreach (BuildTargetGroup eachTarget in Enum.GetValues(typeof(BuildTargetGroup)))" >> SetupPlayFabExample.cs
    echo "            if (ValidEnumValue(eachTarget))" >> SetupPlayFabExample.cs
    echo "                PlayerSettings.SetScriptingDefineSymbolsForGroup(eachTarget, \"$2}\");" >> SetupPlayFabExample.cs
    echo "        AssetDatabase.Refresh();" >> SetupPlayFabExample.cs
    echo "    }" >> SetupPlayFabExample.cs
    echo "    private static bool ValidEnumValue(BuildTargetGroup value)" >> SetupPlayFabExample.cs
    echo "    {" >> SetupPlayFabExample.cs
    echo "        if (value == BuildTargetGroup.Unknown) return false;" >> SetupPlayFabExample.cs
    echo "        var fi = value.GetType().GetField(value.ToString());" >> SetupPlayFabExample.cs
    echo "        var attributes = fi.GetCustomAttributes(typeof(ObsoleteAttribute), false);" >> SetupPlayFabExample.cs
    echo "        return attributes.Length == 0;" >> SetupPlayFabExample.cs
    echo "    }" >> SetupPlayFabExample.cs
    echo "}" >> SetupPlayFabExample.cs
    #set -x
    popd
    #set +x
}

# USAGE: mainScript <all command line args for script>
# USAGE: mainScript.bat [<SdkRepoName>] [<SdkFilePath>] [<DestinationPath>]
mainScript () {
    if [ -z "$1" ]; then
        SdkName=UnitySDK
    else
        SdkName=$1
    fi
    if [ -z "$2" ]; then
        SdkPath=C:/depot/sdks/${SdkName}
    else
        SdkPath=$2
    fi
    if [ -z "$3" ]; then
        ProjRootPath=C:/dev/UnityProjects/${UNITY_VERSION}
    else
        ProjRootPath=$3
    fi

    forceCD "$ProjRootPath"
    doWorkEditor "${SdkName}_BUP"
    if [ $? -ne 0 ]; then return 1; fi
    doWorkTesting "${SdkName}_TA" "ENABLE_PLAYFABADMIN_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    doWorkTesting "${SdkName}_TC"
    if [ $? -ne 0 ]; then return 1; fi
    doWorkTesting "${SdkName}_TS" "ENABLE_PLAYFABSERVER_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    doWorkTesting "${SdkName}_TZ" "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API"
    if [ $? -ne 0 ]; then return 1; fi
}

mainScript "$@"
#forceCD "c:/depot/SDKGenerator/SDKBuildScripts"
