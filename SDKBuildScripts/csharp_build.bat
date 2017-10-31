pushd ..
if [%1] == [] (
rem === BUILDING CSharpSDK ===
node generate.js csharp=..\sdks\CSharpSDK -apiSpecPath
) else (
rem === BUILDING CSharpSDK with params %* ===
node generate.js csharp=..\sdks\CSharpSDK %*
)
popd
pause
