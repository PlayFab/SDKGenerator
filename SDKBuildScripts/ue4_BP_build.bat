pushd ..
if [%1] == [] (
rem === BUILDING UnrealBlueprintSDK ===
node generate.js cpp-unreal=..\sdks\UnrealBlueprintSDK -flags nonnullable -apiSpecGitUrl
) else (
rem === BUILDING UnrealBlueprintSDK with params %* ===
node generate.js cpp-unreal=..\sdks\UnrealBlueprintSDK %*
)
popd

pause
