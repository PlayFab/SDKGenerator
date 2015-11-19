pushd ..\..\sdks\Cocos2d-xSDK
rem === BUILDING Example Project for Cocos2d-xSDK ===
rmdir /s /q PlayFabSDKExample
call cocos new PlayFabSDKExample -l cpp

pushd PlayFabSDKExample
xcopy ..\PlayFabSDK\source\* Classes\ /c /f /s /y
xcopy ..\PlayFabSDK\include\* Classes\ /c /f /s /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleSource\* . /c /f /s /y

popd
popd
