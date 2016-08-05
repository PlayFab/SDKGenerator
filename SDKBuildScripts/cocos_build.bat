pushd ..
if [%1] == [] (
rem === BUILDING Cocos2d-xSDK ===
node generate.js ..\API_Specs cpp-cocos2dx=..\sdks\Cocos2d-xSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING Cocos2d-xSDK with params %* ===
node generate.js ..\API_Specs cpp-cocos2dx=..\sdks\Cocos2d-xSDK %*
)
popd
