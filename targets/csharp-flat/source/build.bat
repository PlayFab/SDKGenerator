IF DEFINED VisualStudioVersion GOTO VSSetup
call "%PROGRAMFILES(x86)%\Microsoft Visual Studio 12.0\VC\vcvarsall.bat"
:VSSetup


msbuild PlayFabSDK.csproj /p:configuration="Debug" /t:Rebuild

msbuild PlayFabSDK.csproj /p:configuration="Release" /t:Rebuild

rd obj /s /q
