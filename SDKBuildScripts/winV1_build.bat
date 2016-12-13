pushd ..
if [%1] == [] (
rem === BUILDING WindowsSDK ===
node generate.js windowssdk=..\sdks\WindowsSDKV1 -apiSpecPath
) else (
rem === BUILDING WindowsSDK with params %* ===
node generate.js windowssdk=..\sdks\WindowsSDKV1 %*
)
popd
