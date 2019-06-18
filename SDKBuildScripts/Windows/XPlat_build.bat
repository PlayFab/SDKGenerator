git submodule update --init --recursive

setlocal
set SdkName=XPlatCppSdk
set targetSrc=xplatcppsdk
set delSrc=true
set noPause=true

cd ..
call shared_build.bat
endlocal
