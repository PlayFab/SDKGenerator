pushd ..
if [%1] == [] (
rem === BUILDING UnrealBlueprintSDK ===
node generate.js ..\API_Specs cpp-unreal=..\sdks\UnrealBlueprintSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING UnrealBlueprintSDK with params %* ===
node generate.js ..\API_Specs cpp-unreal=..\sdks\UnrealBlueprintSDK %*
)
popd

pause
