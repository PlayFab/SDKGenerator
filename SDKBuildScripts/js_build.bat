pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js ..\API_Specs javascript=..\sdks\JavaScriptSDK\PlayFabSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js ..\API_Specs javascript=..\sdks\JavaScriptSDK\PlayFabSDK %*
)
popd
