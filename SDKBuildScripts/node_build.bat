setlocal
set repoName=NodeSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.js
del /S *.ts
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING NodeSDK ===
node generate.js js-node=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING NodeSDK with params %* ===
node generate.js js-node=%destPath% %*
)
popd

pause
endlocal
