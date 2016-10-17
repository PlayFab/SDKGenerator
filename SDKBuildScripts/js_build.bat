pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js javascript=..\sdks\JavaScriptSDK\PlayFabSDK -apiSpecPath
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js javascript=..\sdks\JavaScriptSDK\PlayFabSDK %*
)
popd
