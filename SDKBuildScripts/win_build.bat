pushd ..\SDKGenerator
node generate.js ..\API_Specs cpp-windows=..\sdks\WindowsSDK
popd
pushd ..\sdks\WindowsSDK\PlayFabClientSDK\build\VC12
call build.bat
popd
pushd ..\sdks\WindowsSDK\PlayFabServerSDK\build\VC12
call build.bat
popd
pushd ..\sdks\WindowsSDK\PlayFabSDK\build\VC12
call build.bat
popd
