pushd ..
if [%1] == [] (
rem === BUILDING XPlatCppSdk ===
node generate.js xplatcppsdk=..\sdks\XPlatCppSdk -apiSpecGitUrl
) else (
rem === BUILDING XPlatCppSdk with params %* ===
node generate.js xplatcppsdk=..\sdks\XPlatCppSdk %*
)
popd
pause