pushd ..
if [%1] == [] (
rem === BUILDING PxCsFlat ===
node generate.js ..\API_Specs csharp-flat=..\sdks\PxCsFlat
) else (
rem === BUILDING PxCsFlat with params %* ===
node generate.js ..\API_Specs csharp-flat=..\sdks\PxCsFlat %*
)
popd

pushd ..\..\sdks\PxCsFlat\PlayFabClientSDK
call build.bat
popd

pushd ..\..\sdks\PxCsFlat\PlayFabServerSDK
call build.bat
popd

pushd ..\..\sdks\PxCsFlat\PlayFabSDK
call build.bat
popd

pause