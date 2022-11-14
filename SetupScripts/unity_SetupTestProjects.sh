#!/bin/bash
# USAGE: unity_SetupTestProjects.sh
# Make folder links from the UnitySdk to this test project

if [ -f "util.sh" ]; then
    . "./util.sh" 2> /dev/null
    . "./acUtil.sh" 2> /dev/null
elif [ ! -z "$WORKSPACE" ]; then
    . "$WORKSPACE/SdkGenerator/SetupScripts/util.sh" 2> /dev/null
    . "$WORKSPACE/SdkGenerator/SetupScripts/acUtil.sh" 2> /dev/null
fi

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

# USAGE: DoWorkTesting <ProjectSubfolder> <UnityDefineSymbols>
DoWorkTesting () {
    echo === DoWorkTesting $PWD, $@ ===
    ForcePushD "$1"
    DeleteUnityCruft
    ForcePushD "Assets"
    Nuke "PlayFabSdk"
    cp -r "${WORKSPACE}/sdks/${SdkName}/ExampleTestProject/Assets/PlayFabSDK" .
    Nuke "Testing"
    cp -r "${WORKSPACE}/sdks/${SdkName}/ExampleTestProject/Assets/Testing" .

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
    ForcePushD "${WORKSPACE}/$UNITY_VERSION"
    Nuke "*.txt"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TA" "ENABLE_PLAYFABADMIN_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TS" "ENABLE_PLAYFABSERVER_API;DISABLE_PLAYFABCLIENT_API"
    if [ $? -ne 0 ]; then return 1; fi
    DoWorkTesting "${SdkName}_TZ" "ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API"
    if [ $? -ne 0 ]; then return 1; fi
    popd
}

CheckDefault WORKSPACE "C:/proj"
CheckDefault SHARED_WORKSPACE "C:/depot"
CheckDefault SdkName "UnitySDK"
CheckDefault UNITY_VERSION "Unity193"

# MainScript <all command line args for script>
if [ -z "$TestCompileFlags" ]; then
    TestCompileFlags="true"
fi
if [ "$TestCompileFlags" = "true" ]; then
    MainScript "$@"
fi
