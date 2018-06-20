pushd ..
if [%1] == [] (
rem === BUILDING PythonSDK ===
node generate.js pythonsdk=..\sdks\PythonSDK -apiSpecGitUrl
) else (
rem === BUILDING PythonSDK with params %* ===
node generate.js pythonsdk=..\sdks\PythonSDK %*
)
popd
pause
