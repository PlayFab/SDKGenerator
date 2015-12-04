REM === DEPRECATED FILE - TODO transfer Jenkins to UE4_CPP_build.bat and delete this one ===
pushd ..
rem === BUILDING UnrealEngineSDK ===
node generate.js ..\API_Specs cpp-ue4=..\sdks\UnrealCppSdk
popd
