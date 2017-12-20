pushd ..
if [%1] == [] (
rem === BUILDING JavascriptSDK ===
node generate.js javascript=..\sdks\JavaScriptSDK -apiSpecGitUrl
) else (
rem === BUILDING JavascriptSDK with params %* ===
node generate.js javascript=..\sdks\JavaScriptSDK %*
)
popd
