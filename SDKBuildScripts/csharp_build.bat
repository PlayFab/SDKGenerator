pushd ..
if [%1] == [] (
rem === BUILDING CSharpSDK ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK
) else (
rem === BUILDING CSharpSDK with params %* ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK %*
)
popd

pushd ..\..\sdks\CSharpSDK\PlayFabClientSDK
call build.bat
popd

pushd ..\..\sdks\CSharpSDK\PlayFabServerSDK
call build.bat
popd

pushd ..\..\sdks\CSharpSDK\PlayFabSDK
call build.bat
popd
