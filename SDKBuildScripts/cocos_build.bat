pushd ..
if [%1] == [] (
rem === BUILDING Cocos2d-xSDK ===
node generate.js cpp-cocos2dx=..\sdks\Cocos2d-xSDK -apiSpecGitUrl
) else (
rem === BUILDING Cocos2d-xSDK with params %* ===
node generate.js cpp-cocos2dx=..\sdks\Cocos2d-xSDK %*
)
popd
