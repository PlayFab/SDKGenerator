pushd ..
rem === BUILDING PostmanSDK ===
node generate.js ..\API_Specs PostmanSDK=..\sdks\PostmanSDK
popd
