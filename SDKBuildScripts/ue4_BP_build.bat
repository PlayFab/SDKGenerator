setlocal
set repoName=UnrealBlueprintSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.cpp
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING UnrealBlueprintSDK ===
node generate.js cpp-unreal=%destPath% -flags nonnullable -apiSpecGitUrl
) else (
rem === BUILDING UnrealBlueprintSDK with params %* ===
node generate.js cpp-unreal=%destPath% %*
)
popd

pause
endlocal
