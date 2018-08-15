setlocal
set repoName=UnrealBlueprintSDK
set targetSrc=cpp-unreal
set delSrc=true
set flagsParams=-flags nonnullable

call shared_build.bat
endlocal
