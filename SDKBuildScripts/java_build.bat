pushd ..
if [%1] == [] (
rem === BUILDING JavaSDK ===
node generate.js ..\API_Specs java=..\sdks\JavaSDK
) else (
rem === BUILDING JavaSDK with params %* ===
node generate.js ..\API_Specs java=..\sdks\JavaSDK %*
)
popd
