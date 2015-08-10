cd c:\depot\SDKGenerator
node generate.js ..\API_Specs cpp-windows=..\sdks\WindowsSDK

cd C:\depot\sdks\WindowsSDK\PlayFabClientSDK\build\VC12
call build.bat

pushd C:\depot\sdks\WindowsSDK\PlayFabServerSDK\build\VC12
call build.bat

pushd C:\depot\sdks\WindowsSDK\PlayFabSDK\build\VC12
call build.bat
