pushd ..
rem === BUILDING PostmanCollection ===
node generate.js ..\API_Specs postman=..\sdks\PostmanCollection
popd
