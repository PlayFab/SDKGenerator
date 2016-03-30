pushd ..
if [%1] == [] (
rem === BUILDING UnitySDK ===
node generate.js ..\API_Specs csharp-unity=..\sdks\UnitySDK
) else (
rem === BUILDING UnitySDK with params %* ===
node generate.js ..\API_Specs csharp-unity=..\sdks\UnitySDK %*
)
popd
