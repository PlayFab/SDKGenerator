pushd ..
if [%1] == [] (
rem === BUILDING UnitySDK ===
node generate.js ..\API_Specs csharp-unityv2=..\sdks\UnitySDKV2Beta
) else (
rem === BUILDING UnitySDK with params %* ===
node generate.js ..\API_Specs csharp-unityv2=..\sdks\UnitySDKV2Beta %*
)
popd
