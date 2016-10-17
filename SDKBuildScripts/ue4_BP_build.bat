pushd ..
if [%1] == [] (
rem === BUILDING UnrealBlueprintSDK ===
node generate.js cpp-unreal=..\sdks\UnrealBlueprintSDK -apiSpecPath
) else (
rem === BUILDING UnrealBlueprintSDK with params %* ===
node generate.js cpp-unreal=..\sdks\UnrealBlueprintSDK %*
)
popd

pause
