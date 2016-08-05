pushd ..
if [%1] == [] (
rem === BUILDING CSharpSDK ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING CSharpSDK with params %* ===
node generate.js ..\API_Specs csharp=..\sdks\CSharpSDK %*
)
popd
