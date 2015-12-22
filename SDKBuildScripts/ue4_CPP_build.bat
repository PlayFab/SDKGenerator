rem === Cleaning existing files from UnrealCppSdk ===
pushd ..\..\sdks\UnrealCppSdk
pushd PlayFabSDK\Plugins\PlayFab\Source\PlayFabProxy\Private\Proxy
rmdir /S /Q Admin
rmdir /S /Q Client
rmdir /S /Q Matchmaker
rmdir /S /Q Server
popd
pushd PlayFabSDK\Plugins\PlayFab\Source\PlayFabProxy\Public\Proxy
rmdir /S /Q Admin
rmdir /S /Q Client
rmdir /S /Q Matchmaker
rmdir /S /Q Server
popd
pushd ExampleProject\Plugins\PlayFab\Source\PlayFabProxy\Private\Proxy
rmdir /S /Q Admin
rmdir /S /Q Client
rmdir /S /Q Matchmaker
rmdir /S /Q Server
popd
pushd ExampleProject\Plugins\PlayFab\Source\PlayFabProxy\Public\Proxy
rmdir /S /Q Admin
rmdir /S /Q Client
rmdir /S /Q Matchmaker
rmdir /S /Q Server
popd
popd

pushd ..
rem === BUILDING UnrealEngineSDK ===
node generate.js ..\API_Specs cpp-ue4=..\sdks\UnrealCppSdk
popd
