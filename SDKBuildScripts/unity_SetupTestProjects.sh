#!/bin/bash
# USAGE: unity_SetupTestProjects.sh
# Make folder links from the UnitySdk to this test project
# Requires mklink which may require administrator

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

# USAGE: DeleteUnityCruft
DeleteUnityCruft () {
    echo === DeleteUnityCruft $PWD, $@ ===
    echo ==== BEGIN: Errors about failure to delete are normal ====
    rm -rf .vs
    rm -rf bin
    rm -rf Library
    rm -rf obj
    rm -rf ProjectSettings
    rm -rf Temp
    rm -rf testBuilds
    mkdir testBuilds
    rm -f *.csproj
    rm -f *.sln
    echo ==== END: Errors about failure to delete are normal ====
}


# USAGE: DoWorkEditor <ProjectSubfolder> <UnityDefineSymbols>
DoWorkEditor () {
    echo === DoWorkEditor $PWD, $@ ===
    ForcePushD "$1"
    DeleteUnityCruft
    ForcePushD "Assets"
    cmd <<< "rmdir PlayFabSdk >nul 2>&1"
    cmd <<< "mklink /D PlayFabSdk \"$WORKSPACE/sdks/$SdkName/Source/PlayFabSDK\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Plugins >nul 2>&1"
    cmd <<< "mklink /D Plugins \"$WORKSPACE/sdks/$SdkName/Source/Plugins\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Editor >nul 2>&1"
    cmd <<< "mklink /D Editor \"$WORKSPACE/sdks/$SdkName/Testing/Editor\""
    if [ $? -ne 0 ]; then return 1; fi
    WriteUnitySettingsFile "PlayFabExample/Editor" "$2"
    #set -x
    popd
    popd
    #set +x
}

# USAGE: DoWorkTesting <ProjectSubfolder> <UnityDefineSymbols>
DoWorkTesting () {
    echo === DoWorkTesting $PWD, $@ ===
    ForcePushD "$1"
    DeleteUnityCruft
    ForcePushD "Assets"
    cmd <<< "rmdir PlayFabSdk >nul 2>&1"
    cmd <<< "mklink /D PlayFabSdk \"$WORKSPACE/sdks/$SdkName/Source/PlayFabSDK\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Plugins >nul 2>&1"
    cmd <<< "mklink /D Plugins \"$WORKSPACE/sdks/$SdkName/Source/Plugins\""
    if [ $? -ne 0 ]; then return 1; fi
    cmd <<< "rmdir Testing >nul 2>&1"
    cmd <<< "mklink /D Testing \"$WORKSPACE/sdks/$SdkName/Testing\""
    if [ $? -ne 0 ]; then return 1; fi
    WriteUnitySettingsFile "PlayFabExample/Editor" "$2"
    #set -x
    popd
    popd
    #set +x
}

# USAGE: WriteUnitySettingsFile <DestinationSubfolder> <UnityDefineSymbols>
WriteUnitySettingsFile () {
    echo === WriteUnitySettingsFile $PWD, $@ ===
    ForcePushD "$1"
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

# USAGE: MainScript
MainScript () {
    echo == MainScript $PWD, $@ ==
    ForceCD "$WORKSPACE/$UNITY_VERSION"
    rm -f *.txt || true
    DoWorkEditor "${SdkName}_BUP"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TA" "ENABLE_PLAYFABADMIN_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TC"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TS" "ENABLE_PLAYFABSERVER_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TZ" "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API"
    if [ $? -ne 0 ]; then return 1; fi
}


CheckDefault WORKSPACE C:/proj
CheckDefault SHARED_WORKSPACE C:/depot
CheckDefault SdkName UnitySDK
CheckDefault UNITY_VERSION Unity171

# MainScript <all command line args for script>
MainScript "$@"
#ForceCD "c:/depot/SDKGenerator/SDKBuildScripts"
