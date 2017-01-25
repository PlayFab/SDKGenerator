pushd ..
if [%1] == [] (
rem === BUILDING NewTarget ===
node generate.js CloudScriptExample=..\sdks\CloudScriptExample -apiSpecPath
) else (
rem === BUILDING NewTarget with params %* ===
node generate.js CloudScriptExample=..\sdks\CloudScriptExample %*
)
popd

pause
