pushd ..
if [%1] == [] (
rem === BUILDING NewTarget ===
node generate.js cloudscript-typings=..\sdks\CloudScriptTypings -apiSpecPath
) else (
rem === BUILDING NewTarget with params %* ===
node generate.js cloudscript-typings=..\sdks\CloudScriptTypings %*
)
popd

pause
