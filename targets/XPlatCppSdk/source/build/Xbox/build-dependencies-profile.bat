@echo off
echo === Build Xplat C++ SDK dependencies (BEGIN) ===
echo ATTENTION!
echo This batch file must be run in "Xbox One XDK Visual Studio 2017 Command Prompt"

setlocal
pushd "%~dp0"

rem - set the externals folder path to be used everywhere
pushd ..\..
set sdkRootDir=%cd%
set externalDir=%sdkRootDir%/external
popd

set deps=%externalDir%/deps/

echo --- Cleaning up deps ---
rmdir "%externalDir%/deps/" /s /q
rmdir "%externalDir%/deps-xdk-profile" /s /q

echo --- Building jsoncpp ---
pushd "%externalDir%/jsoncpp-xdk-build"
msbuild.exe lib_json.sln /nologo /t:Build /p:Configuration="Profile" /p:Platform=Durango
if /I "%ERRORLEVEL%" neq "0" (
echo jsoncpp build failed!
exit /B %ERRORLEVEL%
) else (
echo jsoncpp build succeeded.
)

rem - copy headers and binaries to deps
xcopy "../jsoncpp/include/json/*.*" "%deps%include/json/" /E /R /F /Y /H
xcopy "Durango/Profile/lib_json.lib" "%deps%lib/" /R /F /Y /H
xcopy "Durango/Profile/lib_json.pri" "%deps%lib/" /R /F /Y /H
popd

rem - copy the deps folder to build
xcopy "%externalDir%/deps" "%externalDir%/deps-xdk-profile" /I /E /R /F /Y /H
popd

rem - cleanup intermediate deps folders
rmdir "%externalDir%/deps/" /s /q

echo === Build Xplat C++ SDK dependencies (END) ===
echo All dependencies are built successfully.
exit /B 0