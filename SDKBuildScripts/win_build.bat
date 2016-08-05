pushd ..
if [%1] == [] (
rem === BUILDING WindowsSDK ===
node generate.js ..\API_Specs cpp-windows=..\sdks\WindowsSDK -buildIdentifier test_manual_build
) else (
rem === BUILDING WindowsSDK with params %* ===
node generate.js ..\API_Specs cpp-windows=..\sdks\WindowsSDK %*
)
popd
