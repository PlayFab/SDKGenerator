setlocal
set repoName=WindowsSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.h
del /S *.cpp
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING WindowsSDK ===
node generate.js windowssdk=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING WindowsSDK with params %* ===
node generate.js windowssdk=%destPath% %*
)
popd

pause
endlocal
