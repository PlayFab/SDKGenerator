setlocal
set repoName=JavaScriptSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.js
del /S *.ts
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js javascript=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js javascript=%destPath% %*
)
popd

pause
endlocal
