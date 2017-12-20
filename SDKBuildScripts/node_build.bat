pushd ..
if [%1] == [] (
rem === BUILDING NodeSDK ===
node generate.js js-node=..\sdks\NodeSDK -apiSpecGitUrl
) else (
rem === BUILDING NodeSDK with params %* ===
node generate.js js-node=..\sdks\NodeSDK %*
)
popd
