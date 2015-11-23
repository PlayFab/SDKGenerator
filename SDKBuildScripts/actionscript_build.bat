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
rem === BUILDING ActionScriptSDK ===
node generate.js ..\API_Specs actionscript=..\sdks\ActionScriptSDK\PfApiTest
popd
