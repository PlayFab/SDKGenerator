pushd ..\..\sdks\Cocos2d-xSDK
rem === BUILDING Example Project for Cocos2d-xSDK ===
rmdir /s /q PlayFabSDKExample
call cocos new PlayFabSDKExample -l cpp

pushd PlayFabSDKExample
xcopy ..\PlayFabSDK\PlayFabSDK\source\* Classes\ /c /f /s /y
xcopy ..\PlayFabSDK\PlayFabSDK\include\* Classes\ /c /f /s /y

xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\HelloWorldScene.cpp Classes\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\HelloWorldScene.h Classes\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\PlayFabApiTest.cpp Classes\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\PlayFabApiTest.h Classes\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\unistd.h Classes\ /c /f /y

xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\main.cpp proj.win32\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\PlayFabSDKExample.vcxproj proj.win32\ /c /f /y
xcopy ..\..\..\SDKGenerator\targets\cpp-cocos2dx\ExampleFiles\PlayFabSDKExample.vcxproj.filters proj.win32\ /c /f /y

popd
popd