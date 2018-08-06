setlocal
set repoName=XPlatCppSdk
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.cpp
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING XPlatCppSdk ===
node generate.js xplatcppsdk=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING XPlatCppSdk with params %* ===
node generate.js xplatcppsdk=%destPath% %*
)
popd

pause
endlocal