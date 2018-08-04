setlocal
set repoName=Objective_C_SDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.m
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING Objective_C_SDK ===
node generate.js objc=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING Objective_C_SDK with params %* ===
node generate.js objc=%destPath% %*
)
popd

pause
endlocal
