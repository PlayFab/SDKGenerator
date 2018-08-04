setlocal
set repoName=LuaSdk
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.lua
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING LuaSdk ===
node generate.js LuaSdk=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING LuaSdk with params %* ===
node generate.js LuaSdk=%destPath% %*
)
popd

pause
endlocal
