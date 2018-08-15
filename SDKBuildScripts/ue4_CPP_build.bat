setlocal
set repoName=UnrealCppSdk
set targetSrc=cpp-ue4
set delSrc=true
set flagsParams=-flags nonnullable

call shared_build.bat
endlocal
