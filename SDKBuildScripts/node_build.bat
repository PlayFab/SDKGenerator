pushd ..
if [%1] == [] (
rem === BUILDING NodeSDK ===
node generate.js ..\API_Specs js-node=..\sdks\NodeSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING NodeSDK with params %* ===
node generate.js ..\API_Specs js-node=..\sdks\NodeSDK %*
)
popd
