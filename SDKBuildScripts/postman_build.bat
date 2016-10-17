pushd ..
if [%1] == [] (
rem === BUILDING PostmanCollection ===
node generate.js postman=..\sdks\PostmanCollection -apiSpecPath
) else (
rem === BUILDING PostmanCollection with params %* ===
node generate.js postman=..\sdks\PostmanCollection %*
)
popd
