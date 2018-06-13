pushd ..
if [%1] == [] (
rem === BUILDING ActionScriptSDK ===
node generate.js actionscript=..\sdks\ActionScriptSDK -apiSpecGitUrl
) else (
rem === BUILDING ActionScriptSDK with params %* ===
node generate.js actionscript=..\sdks\ActionScriptSDK %*
)
popd

pause
