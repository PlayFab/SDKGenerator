rem === Delete old code files to allow for directory changes ===
pushd ..\..\sdks\LumberyardSdk
pushd PlayFabClientSdk\Code
pushd Include
del /F /Q *.h
popd
pushd Source
del /F /Q *.h
del /F /Q *.cpp
popd
popd
pushd PlayFabSDK\Code
pushd Include
del /F /Q *.h
popd
pushd Source
del /F /Q *.h
del /F /Q *.cpp
popd
popd
pushd PlayFabServerSDK\Code
pushd Include
del /F /Q *.h
popd
pushd Source
del /F /Q *.h
del /F /Q *.cpp
popd
popd
popd

pushd ..
rem === BUILDING LumberyardSdk ===
node generate.js ..\API_Specs LumberyardSdk=..\sdks\LumberyardSdk
popd
