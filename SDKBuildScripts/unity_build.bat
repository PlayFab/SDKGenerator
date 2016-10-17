pushd ..
if [%1] == [] (
rem === BUILDING UnitySDK ===
node generate.js unity-v2=..\sdks\UnitySDK -apiSpecPath
) else (
rem === BUILDING UnitySDK with params %* ===
node generate.js unity-v2=..\sdks\UnitySDK %*
)
popd
