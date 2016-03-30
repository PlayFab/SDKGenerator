rem === Cleaning existing files from ActionScriptSDK ===
pushd ..\..\sdks\ActionScriptSDK\PfApiTest\com\playfab
pushd AdminModels
del *.as >nul 2>&1
popd
pushd ClientModels
del *.as >nul 2>&1
popd
pushd MatchmakerModels
del *.as >nul 2>&1
popd
pushd ServerModels
del *.as >nul 2>&1
popd
popd

pushd ..
if [%1] == [] (
rem === BUILDING ActionScriptSDK ===
node generate.js ..\API_Specs actionscript=..\sdks\ActionScriptSDK\PfApiTest
) else (
rem === BUILDING ActionScriptSDK with params %* ===
node generate.js ..\API_Specs actionscript=..\sdks\ActionScriptSDK\PfApiTest %*
)
popd
