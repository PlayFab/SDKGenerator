pushd ..
if [%1] == [] (
rem === BUILDING JavaSDK ===
node generate.js java=..\sdks\JavaSDK -apiSpecGitUrl
) else (
rem === BUILDING JavaSDK with params %* ===
node generate.js java=..\sdks\JavaSDK %*
)
popd

pause
