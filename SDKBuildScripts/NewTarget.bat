setlocal
set repoName=NewTarget
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
rem del /S *.notapplicable
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING NewTarget ===
node generate.js newTarget=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING NewTarget with params %* ===
node generate.js newTarget=%destPath% %*
)
popd

pause
endlocal
