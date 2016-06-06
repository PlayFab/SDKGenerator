pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js ..\API_Specs javascript=..\sdks\JavaScriptSDK\PlayFabSDK
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js ..\API_Specs javascript=..\sdks\JavaScriptSDK\PlayFabSDK %*
)
popd
