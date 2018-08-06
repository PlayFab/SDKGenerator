setlocal
set repoName=SdkTestingCloudScript
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.js
del /S *.ts
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING NewTarget ===
node generate.js SdkTestingCloudScript=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING NewTarget with params %* ===
node generate.js SdkTestingCloudScript=%destPath% %*
)
popd

pause
endlocal
