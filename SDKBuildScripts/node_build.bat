pushd ..
if [%1] == [] (
rem === BUILDING NodeSDK ===
node generate.js js-node=..\sdks\NodeSDK -apiSpecPath
) else (
rem === BUILDING NodeSDK with params %* ===
node generate.js js-node=..\sdks\NodeSDK %*
)
popd
