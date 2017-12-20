pushd ..
if [%1] == [] (
rem === BUILDING PxCsFlat ===
node generate.js csharp-flat=..\sdks\PxCsFlat -apiSpecGitUrl
) else (
rem === BUILDING PxCsFlat with params %* ===
node generate.js csharp-flat=..\sdks\PxCsFlat %*
)
popd
