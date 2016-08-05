pushd ..
if [%1] == [] (
rem === BUILDING PostmanCollection ===
node generate.js ..\API_Specs postman=..\sdks\PostmanCollection -buildIdentifier test_manual_build
) else (
rem === BUILDING PostmanCollection with params %* ===
node generate.js ..\API_Specs postman=..\sdks\PostmanCollection %*
)
popd
