pushd ..
if [%1] == [] (
rem === BUILDING NodeSDK ===
node generate.js ..\API_Specs js-node=..\sdks\NodeSDK
) else (
rem === BUILDING NodeSDK with params %* ===
node generate.js ..\API_Specs js-node=..\sdks\NodeSDK %*
)
popd
