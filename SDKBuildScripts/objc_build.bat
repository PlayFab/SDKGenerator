pushd ..
if [%1] == [] (
rem === BUILDING Objective_C_SDK ===
node generate.js ..\API_Specs objc=..\sdks\Objective_C_SDK -buildIdentifier test_manual_build
) else (
rem === BUILDING Objective_C_SDK with params %* ===
node generate.js ..\API_Specs objc=..\sdks\Objective_C_SDK %*
)
popd
