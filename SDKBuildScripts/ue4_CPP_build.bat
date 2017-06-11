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
if [%1] == [] (
rem === BUILDING UnrealCppSdk ===
node generate.js cpp-ue4=..\sdks\UnrealCppSdk -flags nonnullable -apiSpecPath
) else (
rem === BUILDING UnrealCppSdk with params %* ===
node generate.js cpp-ue4=..\sdks\UnrealCppSdk %*
)
popd
