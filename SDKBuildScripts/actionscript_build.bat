setlocal
set repoName=ActionScriptSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.as
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING ActionScriptSDK ===
node generate.js actionscript=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING ActionScriptSDK with params %* ===
node generate.js actionscript=%destPath% %*
)
popd

pause
endlocal
