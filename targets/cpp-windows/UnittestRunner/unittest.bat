IF DEFINED VisualStudioVersion GOTO VSSetup
call "%PROGRAMFILES(x86)%\Microsoft Visual Studio 12.0\VC\vcvarsall.bat"
:VSSetup

rem msbuild UnittestRunner.vcxproj /p:configuration="Debug" /p:platform="Win32" /t:Rebuild

vstest.console.exe /Platform:x86 Debug\UnittestRunner.dll
