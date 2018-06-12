pushd ..
if [%1] == [] (
rem === BUILDING LuaSdk ===
node generate.js LuaSdk=..\sdks\LuaSdk -apiSpecGitUrl
) else (
rem === BUILDING LuaSdk with params %* ===
node generate.js LuaSdk=..\sdks\LuaSdk %*
)
popd

pause
