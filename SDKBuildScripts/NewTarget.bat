pushd ..
if [%1] == [] (
rem === BUILDING NewTarget ===
node generate.js newTarget=..\sdks\NewTarget -apiSpecPath
) else (
rem === BUILDING NewTarget with params %* ===
node generate.js newTarget=..\sdks\NewTarget %*
)
popd

pause
