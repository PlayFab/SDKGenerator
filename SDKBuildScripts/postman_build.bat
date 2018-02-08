pushd ..
if [%1] == [] (
rem === BUILDING PostmanCollection ===
node generate.js postman=..\sdks\PostmanCollection -apiSpecGitUrl
) else (
rem === BUILDING PostmanCollection with params %* ===
node generate.js postman=..\sdks\PostmanCollection %*
)
popd
