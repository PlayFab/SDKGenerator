pushd ..
if [%1] == [] (
rem === BUILDING PhpSdk ===
node generate.js PhpSdk=..\sdks\PhpSdk -apiSpecPath
) else (
rem === BUILDING PhpSdk with params %* ===
node generate.js PhpSdk=..\sdks\PhpSdk %*
)
popd
pause