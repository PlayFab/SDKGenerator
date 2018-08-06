setlocal
set repoName=PostmanCollection
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
rem del /S *.notapplicable
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING PostmanCollection ===
node generate.js postman=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING PostmanCollection with params %* ===
node generate.js postman=%destPath% %*
)
popd

pause
endlocal
