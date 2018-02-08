pushd ..
if [%1] == [] (
rem === BUILDING PhpSdk ===
node generate.js PhpSdk=..\sdks\PhpSdk -apiSpecGitUrl
) else (
rem === BUILDING PhpSdk with params %* ===
node generate.js PhpSdk=..\sdks\PhpSdk %*
)
popd
pause