setlocal
set repoName=JavaSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.java
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING JavaSDK ===
node generate.js java=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING JavaSDK with params %* ===
node generate.js java=%destPath% %*
)
popd

pause
endlocal
