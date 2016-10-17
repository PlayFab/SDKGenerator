pushd ..
if [%1] == [] (
rem === BUILDING LuaSdk ===
node generate.js LuaSdk=..\sdks\LuaSdk -apiSpecPath
) else (
rem === BUILDING LuaSdk with params %* ===
node generate.js LuaSdk=..\sdks\LuaSdk %*
)
popd
