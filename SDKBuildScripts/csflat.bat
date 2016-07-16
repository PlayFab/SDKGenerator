pushd ..
if [%1] == [] (
rem === BUILDING PxCsFlat ===
node generate.js ..\API_Specs csharp-flat=..\sdks\PxCsFlat
) else (
rem === BUILDING PxCsFlat with params %* ===
node generate.js ..\API_Specs csharp-flat=..\sdks\PxCsFlat %*
)
popd
