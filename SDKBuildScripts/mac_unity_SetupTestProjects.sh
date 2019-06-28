#!/bin/bash
# USAGE: unity_SetupTestProjects.sh
# Make folder links from the UnitySdk to this test project
# Requires mklink which may require administrator

. $SHARED_WORKSPACE/SDKGenerator/JenkinsConsoleUtility/JenkinsScripts/util.sh

# USAGE Nuke <folderLinkName>
Nuke () {
    rm "$1" 2> /dev/null || rm -f "$1" 2> /dev/null || rm -r "$1" 2> /dev/null || rm -rf "$1" 2> /dev/null || true
}

# USAGE: DeleteUnityCruft
DeleteUnityCruft () {
    echo === DeleteUnityCruft $PWD, $@ ===
    Nuke ".vs"
    Nuke "bin"
    Nuke "Library"
    Nuke "obj"
    Nuke "ProjectSettings"
    Nuke "Temp"
    Nuke "testBuilds"
    mkdir testBuilds
    Nuke "*.csproj"
    Nuke "*.sln"
}


# USAGE: DoWorkEditor <ProjectSubfolder> <UnityDefineSymbols>
DoWorkEditor () {
    echo === DoWorkEditor $PWD, $@ ===
    ForcePushD "$1"
    DeleteUnityCruft
    ForcePushD "Assets"
    Nuke "PlayFabSdk"
    ln -Fvs PlayFabSdk "$WORKSPACE/sdks/$SdkName/Source/PlayFabSDK"
    if [ $? -ne 0 ]; then return 1; fi
    Nuke "Editor"
    ln -Fvs Editor "$WORKSPACE/sdks/$SdkName/Testing/Editor"
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
    Nuke "PlayFabSdk"
    ln -Fvs PlayFabSdk "$WORKSPACE/sdks/$SdkName/Source/PlayFabSDK"
    if [ $? -ne 0 ]; then return 1; fi
    Nuke "Testing"
    ln -Fvs Testing "$WORKSPACE/sdks/$SdkName/Testing"
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
    # echo "        UnityEngine.Debug.Log(\" HERE IS THE ATTEMPT \");" >> SetupPlayFabExample.cs
    echo "        foreach (BuildTargetGroup eachTarget in Enum.GetValues(typeof(BuildTargetGroup)))" >> SetupPlayFabExample.cs
    echo "        {" >> SetupPlayFabExample.cs
    # echo "            UnityEngine.Debug.Log(\" HERE IS THE Target \" + eachTarget.ToString());" >> SetupPlayFabExample.cs
    # echo "            UnityEngine.Debug.Log(\" HERE IS THE SECOND PARAM $2\");" >> SetupPlayFabExample.cs
    echo "            if (ValidEnumValue(eachTarget))" >> SetupPlayFabExample.cs
    echo "            {" >> SetupPlayFabExample.cs
    echo "                PlayerSettings.SetScriptingDefineSymbolsForGroup(eachTarget, \"$2}\");" >> SetupPlayFabExample.cs
    # echo "                UnityEngine.Debug.Log(\" VALIDATED \");" >> SetupPlayFabExample.cs
    echo "            }" >> SetupPlayFabExample.cs
    echo "        }" >> SetupPlayFabExample.cs
    # echo "        UnityEngine.Debug.Log(\" DONE WITH TARGETGROUP \");" >> SetupPlayFabExample.cs
    echo "        AssetDatabase.Refresh();" >> SetupPlayFabExample.cs
    # echo "        UnityEngine.Debug.Log(\" DONE WITH ASSET REFRESH \");" >> SetupPlayFabExample.cs
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
    ForcePushD "$WORKSPACE/$UNITY_VERSION"
    Nuke "*.txt"
    DoWorkEditor "${SdkName}_BUP"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TA" "ENABLE_PLAYFABADMIN_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TC" ""
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TS" "ENABLE_PLAYFABSERVER_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TZ" "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API"
    if [ $? -ne 0 ]; then return 1; fi
    popd
}

CheckDefault WORKSPACE "Users/jenkins/shared_workspace"
CheckDefault SHARED_WORKSPACE "/Users/jenkins/shared_workspace"
CheckDefault SdkName "UnitySDK"
# CheckDefault UNITY_VERSION "Unity181"

# MainScript <all command line args for script>
MainScript "$@"
