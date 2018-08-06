setlocal
set repoName=PythonSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.py
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING PythonSDK ===
node generate.js pythonsdk=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING PythonSDK with params %* ===
node generate.js pythonsdk=%destPath% %*
)
popd

pause
endlocal
