pushd ..
if [%1] == [] (
rem === BUILDING WindowsSDK ===
node generate.js cpp-windows=..\sdks\WindowsSDK -apiSpecPath
) else (
rem === BUILDING WindowsSDK with params %* ===
node generate.js cpp-windows=..\sdks\WindowsSDK %*
)
popd
