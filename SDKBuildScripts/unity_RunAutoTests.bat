rem USAGE: unity_RunAutoTests.bat [<UnityExe>] [<SdkRepoName>] [<ProjRootPath>] [<BuildIdentifier>]
@echo on
rem Make folder links from the UnitySdk to this test project
rem Requires mklink which may require administrator
rem Requires the following environment variables:
rem   TestAndroid - (Optional - Default true if unset) set to "false" (without quotes) to skip building Android APK
rem   TestiPhone - (Optional - Default true if unset) set to "false" (without quotes) to skip building iOS XCode project
rem   TestWp8 - (Optional - Default true if unset) set to "false" (without quotes) to skip building Windows Universal 8 vs-sln
rem   UNITY_PUBLISH_VERSION - (Not required if %1 is defined) Versioned Unity executable name (Assumes multiple potential Unity installations, all in your PATH, each uniquely renamed)
rem   EXECUTOR_NUMBER - (Not required if %4 is defined) Automatic Jenkins variable

setlocal
if [%1]==[] (
    set UnityExe=%UNITY_PUBLISH_VERSION%
) ELSE (
    set UnityExe=%1
)
if [%2]==[] (
    set SdkName=UnitySDK
) ELSE (
    set SdkName=%2
)
if [%3]==[] (
    set ProjRootPath=C:\dev\UnityProjects\%UnityExe%
) ELSE (
    set ProjRootPath=%~3
)
if [%4]==[] (
    set BuildIdentifier=JBuild_%SdkName%_%EXECUTOR_NUMBER%
) ELSE (
    set BuildIdentifier=%4
)
if [%TestAndroid%]==[] (set TestAndroid=true)
if [%TestiPhone%]==[] (set TestiPhone=true)
if [%TestWp8%]==[] (set TestWp8=true)

call :SetProjDefines
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :RunClientJenkernaught1
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :RunClientJenkernaught2
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :RunClientJenkernaught3
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
IF [%TestAndroid%]==[true] (call :BuildAndroid)
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
IF [%TestiPhone%]==[true] (call :BuildiPhone)
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
IF [%TestWp8%]==[true] (call :BuildWp8)
endlocal
exit /b %errorLevel%

:SetProjDefines
echo === Test compilation in all example projects ===
call :SetEachProjDefine %SdkName%_BUP
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :SetEachProjDefine %SdkName%_TA
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :SetEachProjDefine %SdkName%_TC
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :SetEachProjDefine %SdkName%_TS
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
call :SetEachProjDefine %SdkName%_TZ
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:SetEachProjDefine
cd "%ProjRootPath%\%1"
%UnityExe% -projectPath "%ProjRootPath%\%1" -quit -batchmode -executeMethod SetupPlayFabExample.Setup -logFile "%ProjRootPath%\compile%1.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:RunClientJenkernaught1
echo === Build Win32 Client Target ===
cd "%ProjRootPath%\%SdkName%_TC"
%UnityExe% -projectPath "%ProjRootPath%\%SdkName%_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeWin32TestingBuild -logFile "%ProjRootPath%\buildWin32Client.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:RunClientJenkernaught2
echo === Run the %UnityExe% Client UnitTests ===
cd "%ProjRootPath%\%SdkName%_TC\testBuilds"
Win32test -batchmode -nographics -logFile "%ProjRootPath%\clientTestOutput.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:RunClientJenkernaught3
echo === Save test results to Jenkernaught ===
cd %WORKSPACE%/SDKGenerator/JenkinsConsoleUtility/bin/Debug
JenkinsConsoleUtility --listencs -buildIdentifier %BuildIdentifier% -workspacePath %WORKSPACE% -timeout 30
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:BuildAndroid
echo === Build Android Target ===
cd "%ProjRootPath%\%SdkName%_TC"
%UnityExe% -projectPath "%ProjRootPath%\%SdkName%_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeAndroidBuild -logFile "%ProjRootPath%\buildAndroidOutput.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:BuildiPhone
echo === Build iPhone Target ===
cd "%ProjRootPath%\%SdkName%_TC"
%UnityExe% -projectPath "%ProjRootPath%\%SdkName%_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeIPhoneBuild -logFile "%ProjRootPath%\buildiPhoneOutput.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF

:BuildWp8
echo === Build WinPhone Target ===
cd "%ProjRootPath%\%SdkName%_TC"
%UnityExe% -projectPath "%ProjRootPath%\%SdkName%_TC" -quit -batchmode -executeMethod PlayFab.Internal.PlayFabPackager.MakeWp8Build -logFile "%ProjRootPath%\buildWp8Output.txt"
if %errorLevel% NEQ 0 (exit /b %errorLevel%)
goto :EOF
