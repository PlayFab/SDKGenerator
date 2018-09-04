setlocal
set SdkName=UnrealBlueprintSDK
set targetSrc=cpp-unreal
set delSrc=true
set SdkGenArgs=-flags nonnullable

call shared_build.bat
endlocal
