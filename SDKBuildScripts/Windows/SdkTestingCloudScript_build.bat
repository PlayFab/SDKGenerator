setlocal
set SdkName=SdkTestingCloudScript
set targetSrc=SdkTestingCloudScript
rem Doesn't catch what we expect to catch, and is not needed for actual change
set delSrc=false

cd ..

call shared_build.bat
endlocal
