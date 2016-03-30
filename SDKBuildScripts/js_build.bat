pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js ..\API_Specs javascript=..\sdks\JavascriptSDK\PlayFabSDK
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js ..\API_Specs javascript=..\sdks\JavascriptSDK\PlayFabSDK %*
)
popd
