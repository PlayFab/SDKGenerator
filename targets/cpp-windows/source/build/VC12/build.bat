IF DEFINED VisualStudioVersion GOTO VSSetup
call "%PROGRAMFILES(x86)%\Microsoft Visual Studio 12.0\VC\vcvarsall.bat"
:VSSetup


msbuild PlayFabAPI\PlayFabAPI.vcxproj /p:configuration="Debug" /p:platform="Win32" /t:Rebuild

msbuild PlayFabAPI\PlayFabAPI.vcxproj /p:configuration="Release" /p:platform="Win32" /t:Rebuild

msbuild PlayFabAPI\PlayFabAPI.vcxproj /p:configuration="Debug" /p:platform="x64" /t:Rebuild

msbuild PlayFabAPI\PlayFabAPI.vcxproj /p:configuration="Release" /p:platform="x64" /t:Rebuild
