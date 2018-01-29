pushd ..
if [%1] == [] (
rem === BUILDING GolangSDK ===
node generate.js golangSDK=..\sdks\GolangSDK -apiSpecPath
) else (
rem === BUILDING GolangSDK with params %* ===
node generate.js golangSDK=..\sdks\GolangSDK %*
)
popd
