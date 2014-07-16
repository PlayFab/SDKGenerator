node generate.js ..\API_Specs csharp-unity=..\sdks\UnitySDK cpp-windows=..\sdks\WindowsSDK
pushd ..\sdks\WindowsSDK\PlayFabClientSDK\build\VC12
make.bat
popd
pushd ..\sdks\WindowsSDK\PlayFabServerSDK\build\VC12
make.bat
popd
pushd ..\sdks\WindowsSDK\PlayFabSDK\build\VC12
make.bat
popd
