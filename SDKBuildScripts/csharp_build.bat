pushd ..
if [%1] == [] (
rem === BUILDING CSharpSDK ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK
) else (
rem === BUILDING CSharpSDK with params %* ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK %*
)
popd
