pushd ..
if [%1] == [] (
rem === BUILDING WindowsSDK ===
node generate.js windowssdk=..\sdks\WindowsSDK -apiSpecGitUrl
) else (
rem === BUILDING WindowsSDK with params %* ===
node generate.js windowssdk=..\sdks\WindowsSDK %*
)
popd
pause