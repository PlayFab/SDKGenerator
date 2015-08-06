cd c:\depot\SDKGenerator
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK

cd c:\depot\sdks\CSharpSDK\PlayFabClientSDK
call build.bat

cd c:\depot\sdks\CSharpSDK\PlayFabServerSDK
call build.bat

cd c:\depot\sdks\CSharpSDK\PlayFabSDK
call build.bat
