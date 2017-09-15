rem === Cleaning existing files from UnrealCppSdk ===
pushd ..\..\sdks\UnrealCppSdk
pushd PlayFabSDK\Plugins
rmdir /S /Q PlayFab
rmdir /S /Q PlayFabProxy
popd
pushd ExampleProject\Plugins
rmdir /S /Q PlayFab
rmdir /S /Q PlayFabProxy
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

pause