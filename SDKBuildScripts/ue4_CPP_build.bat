setlocal
set repoName=UnrealCppSdk
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.cpp
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING UnrealCppSdk ===
node generate.js cpp-ue4=%destPath% -apiSpecGitUrl -flags nonnullable
) else (
rem === BUILDING UnrealCppSdk with params %* ===
node generate.js cpp-ue4=%destPath% %*
)
popd

pause
endlocal
