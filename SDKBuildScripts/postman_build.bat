pushd ..
if [%1] == [] (
rem === BUILDING PostmanCollection ===
node generate.js ..\API_Specs postman=..\sdks\PostmanCollection
) else (
rem === BUILDING PostmanCollection with params %* ===
node generate.js ..\API_Specs postman=..\sdks\PostmanCollection %*
)
popd
