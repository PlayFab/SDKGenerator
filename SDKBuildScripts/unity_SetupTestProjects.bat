rem USAGE: unity_SetupTestProjects.bat [<SdkRepoName>] [<SdkFilePath>] [<DestinationPath>]
@echo off
rem Make folder links from the UnitySdk to this test project
rem Requires mklink which may require administrator

setlocal
if [%1]==[] (
    set SdkName=UnitySDK
) ELSE (
    set SdkName=%1
)
if [%2]==[] (
    set SdkPath=C:\depot\sdks\%SdkName%
) ELSE (
    set SdkPath=%~2
)
if [%3]==[] (
    set ProjRootPath=C:\dev\UnityProjects\%UNITY_VERSION%
) ELSE (
    set ProjRootPath=%~3
)

@echo on
call :forceCD "%ProjRootPath%"
@echo off

rem SET /P AREYOUSURE=Are you sure (Y/[N])?
rem IF /I "%AREYOUSURE%" NEQ "Y" exit /b 1

call :doWorkEditor %SdkName%_BUP
call :doWorkTesting %SdkName%_TA ENABLE_PLAYFABADMIN_API;DISABLE_PLAYFABCLIENT_API
call :doWorkTesting %SdkName%_TC
call :doWorkTesting %SdkName%_TS ENABLE_PLAYFABSERVER_API;DISABLE_PLAYFABCLIENT_API
call :doWorkTesting %SdkName%_TZ ENABLE_PLAYFABADMIN_API;ENABLE_PLAYFABSERVER_API
pause
endlocal
exit /b 0

rem USAGE: call :doWorkEditor <ProjectSubfolder> <UnityDefineSymbols>
:doWorkEditor
call :forcePushD "%~1"
call :deleteCruft
call :forcePushD Assets
rmdir PlayFabSdk
mklink /D PlayFabSdk "%SdkPath%\Source\PlayFabSDK"
rmdir Plugins
mklink /D Plugins "%SdkPath%\Source\Plugins"
rmdir Editor
mklink /D Editor "%SdkPath%\Testing\Editor"
call :writeUnitySettingsFile PlayFabExample\Editor %2
popd
popd
goto :EOF

rem USAGE: call :doWorkTesting <ProjectSubfolder> <UnityDefineSymbols>
:doWorkTesting
call :forcePushD "%1"
call :deleteCruft
call :forcePushD Assets
rmdir PlayFabSdk
mklink /D PlayFabSdk "%SdkPath%\Source\PlayFabSDK"
rmdir Plugins
mklink /D Plugins "%SdkPath%\Source\Plugins"
rmdir Testing
mklink /D Testing "%SdkPath%\Testing"
call :writeUnitySettingsFile PlayFabExample\Editor %2
popd
popd
goto :EOF


rem USAGE: call :forceCD <path>
:forceCD
cd %1
if %errorLevel% EQU 1 (
    mkdir %1
    cd %1
)
goto :EOF

rem USAGE: call :forcePushD <path>
:forcePushD
pushd %1
if %errorLevel% EQU 1 (
    mkdir %1
    pushd %1
)
goto :EOF

rem USAGE: call :deleteCruft
:deleteCruft
rmdir /S /Q .vs
rmdir /S /Q bin
rmdir /S /Q Library
rmdir /S /Q obj
rmdir /S /Q ProjectSettings
rmdir /S /Q Temp
rmdir /S /Q testBuilds
mkdir testBuilds
del /F /Q *.csproj
del /F /Q *.sln
goto :EOF

rem USAGE: call :writeUnitySettingsFile <DestinationSubfolder> <UnityDefineSymbols>
:writeUnitySettingsFile
setlocal ENABLEDELAYEDEXPANSION
call :forcePushD "%~1"
(
echo using System;
echo using UnityEditor;
echo public static class SetupPlayFabExample
echo {
echo     public static void Setup^(^)
echo     {
echo         foreach ^(BuildTargetGroup eachTarget in Enum.GetValues^(typeof^(BuildTargetGroup^)^)^)
echo             if ^(eachTarget == 0^) {} else // Can't put an exclamation mark in bat-script, which generates this
echo                 PlayerSettings.SetScriptingDefineSymbolsForGroup^(eachTarget, "%2"^);
echo         AssetDatabase.Refresh^(^);
echo     }
echo }
)>SetupPlayFabExample.cs
popd
goto :EOF
