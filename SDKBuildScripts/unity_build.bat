pushd ..

pushd ..\sdks\UnitySDK
attrib -H *.meta /S /D
popd

if [%1] == [] (
rem === BUILDING UnitySDK ===
node generate.js unity-v2=..\sdks\UnitySDK -apiSpecGitUrl
) else (
rem === BUILDING UnitySDK with params %* ===
node generate.js unity-v2=..\sdks\UnitySDK %*
)
popd
pause