setlocal
set repoName=SdkTestingCloudScript
set targetSrc=SdkTestingCloudScript
rem Doesn't catch what we expect to catch, and is not needed for actual change
set delSrc=false
set flagsParams=

call shared_build.bat
endlocal
