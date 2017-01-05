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
node generate.js actionscript=..\sdks\ActionScriptSDK -apiSpecPath
) else (
rem === BUILDING ActionScriptSDK with params %* ===
node generate.js actionscript=..\sdks\ActionScriptSDK %*
)
popd
