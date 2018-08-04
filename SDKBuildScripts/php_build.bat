setlocal
set repoName=PhpSdk
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.php
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING PhpSdk ===
node generate.js PhpSdk=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING PhpSdk with params %* ===
node generate.js PhpSdk=%destPath% %*
)
popd

pause
endlocal
