REM === DEPRECATED FILE - TODO transfer Jenkins to UE4_BP_build.bat and delete this one ===
pushd ..
rem === BUILDING UnrealBlueprintSDK ===
node generate.js ..\API_Specs cpp-unreal=..\sdks\UnrealBlueprintSDK
popd
