pushd ..
if [%1] == [] (
rem === BUILDING PythonSDK ===
node generate.js python=..\sdks\PythonSDK -apiSpecGitUrl
) else (
rem === BUILDING PythonSDK with params %* ===
node generate.js python=..\sdks\PythonSDK %*
)
popd
pause
