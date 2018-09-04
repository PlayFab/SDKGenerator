setlocal
set SdkName=UnrealCppSdk
set targetSrc=cpp-ue4
set delSrc=true
set SdkGenArgs=-flags nonnullable

call shared_build.bat
endlocal
