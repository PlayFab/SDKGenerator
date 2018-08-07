setlocal
set repoName=SdkTestingCloudScript
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
rem Doesn't catch what we expect to catch, and is not needed for actual change
rem del /S *.js
rem del /S *.ts
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
