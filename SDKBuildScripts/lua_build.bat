pushd ..
if [%1] == [] (
rem === BUILDING LuaSdk ===
node generate.js ..\API_Specs LuaSdk=..\sdks\LuaSdk -buildIdentifier test_manual_build
) else (
rem === BUILDING LuaSdk with params %* ===
node generate.js ..\API_Specs LuaSdk=..\sdks\LuaSdk %*
)
popd
