rem "Run with administrator" required
rem   run-admin resets the bat file to c:\windows\system32, which is stupidly unsafe, and ...
rem   we need to reset it back to the location of this bat file
cd %~dp0

SETLOCAL
set tempBuildPath=C:\depot\sdks\LuaSdk\_Build\BuiltCorona
set CoronaSrcPath=C:\depot\sdks\LuaSdk\_Build\Corona
set CoronaDestPath=C:\depot\sdks\LuaSdk\Corona
set CoronaPluginPath=%CoronaDestPath%\Plugins

rem === Build the ClientSdk ===
pushd CoronaClientSdk
pushd lua\plugin
rmdir /S /Q PLUGIN_NAME
mklink /D PLUGIN_NAME %CoronaSrcPath%\PlayFabClientSdk\PlayFab
pushd ..
rmdir /S /Q PlayFabTesting
mklink /D PlayFabTesting %CoronaSrcPath%\PlayFabClientSdk\PlayFabTesting
popd
popd

rmdir /S /Q %tempBuildPath%\CoronaClientSdk
call create_project.bat %tempBuildPath%\CoronaClientSdk PlayFabClientSdk
popd

rem === Temp src zip
del /F /Q %CoronaPluginPath%\ClientPluginSrc.zip
7z a %CoronaPluginPath%\ClientPluginSrc.zip CoronaClientSdk


rem === Build the ServerSdk ===
pushd CoronaServerSdk
pushd lua\plugin
rmdir /S /Q PLUGIN_NAME
mklink /D PLUGIN_NAME %CoronaSrcPath%\PlayFabServerSdk\PlayFab
popd

rmdir /S /Q %tempBuildPath%\CoronaServerSdk
call create_project.bat %tempBuildPath%\CoronaServerSdk PlayFabServerSdk
popd

rem === Temp src zip
del /F /Q %CoronaPluginPath%\ServerPluginSrc.zip
7z a %CoronaPluginPath%\ServerPluginSrc.zip CoronaServerSdk

rem === Build the ComboSdk ===
pushd CoronaComboSdk
pushd lua\plugin
rmdir /S /Q PLUGIN_NAME
mklink /D PLUGIN_NAME %CoronaSrcPath%\PlayFabSdk\PlayFab
popd

rmdir /S /Q %tempBuildPath%\CoronaComboSdk
call create_project.bat %tempBuildPath%\CoronaComboSdk PlayFabComboSdk
popd

rem === Temp src zip
del /F /Q %CoronaPluginPath%\ComboPluginSrc.zip
7z a %CoronaPluginPath%\ComboPluginSrc.zip CoronaComboSdk

rem === Move the zips to the published location
pushd ..\BuiltCorona\CoronaClientSdk
call build.bat
copy /Y plugin-PlayFabClientSdk.zip %CoronaPluginPath%\plugin-PlayFabClientSdk.zip
popd

pushd ..\BuiltCorona\CoronaServerSdk
call build.bat
copy /Y plugin-PlayFabServerSdk.zip %CoronaPluginPath%\plugin-PlayFabServerSdk.zip
popd

pushd ..\BuiltCorona\CoronaComboSdk
call build.bat
copy /Y plugin-PlayFabComboSdk.zip %CoronaPluginPath%\plugin-PlayFabComboSdk.zip
popd


rem === Build the "do it yourself" copy/paste zips
cd ../Corona
del /F /Q %CoronaDestPath%\PlayFabClientSdk.zip
7z a %CoronaDestPath%\PlayFabClientSdk.zip PlayFabClientSdk
del /F /Q %CoronaDestPath%\PlayFabServerSdk.zip
7z a %CoronaDestPath%\PlayFabServerSdk.zip PlayFabServerSdk
del /F /Q %CoronaDestPath%\PlayFabComboSdk.zip
7z a %CoronaDestPath%\PlayFabComboSdk.zip PlayFabSdk


pause
