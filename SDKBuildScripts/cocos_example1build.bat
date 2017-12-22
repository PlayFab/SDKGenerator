setlocal
echo off
goto :DoWork

rem This example is no longer published. But now that it's unpublished, we can just use it in-place to test the build.

:BuildExample
pushd ..\..\sdks\Cocos2d-xSDK
echo === BUILDING Example Project for Cocos2d-xSDK ===
rmdir /s /q PlayFabSDKExample
call cocos new PlayFabSDKExample -l cpp
rem --- Fail quickly if the cocos example couldn't be built ---
set BuildResult=%errorlevel%
if %BuildResult% EQU 0 (
    pushd PlayFabSDKExample
    xcopy ..\PlayFabSDK\* Classes\ /c /f /s /y
    xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleSource\* . /c /f /s /y
)
popd
popd
exit /b %BuildResult%

:DoWork
call :BuildExample
rem --- If it failed, try one more time ---
if %errorlevel% NEQ 0 (call :BuildExample)

pause
