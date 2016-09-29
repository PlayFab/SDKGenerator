rem run-admin resets the bat file to c:\windows\system32, which is stupidly unsafe, and ...
rem we need to reset it back to the location of this bat file
cd %~dp0

SETLOCAL
set tempBuildPath=C:\depot\sdks\LuaSdk\_Build\BuiltCorona
set CoronaDestPath=C:\depot\sdks\LuaSdk\Corona
set CoronaPluginPath=%CoronaDestPath%\Plugins
set CoronaRepo=C:\depot\sdks\store-hosted-playfab

call :doWork client
call :doWork server
call :doWork combo
goto :endWithPause

:doWork
rem === Build the %1 plugin ===
pushd %1
rmdir /S /Q %tempBuildPath%\Corona%1Plugin
call create_project.bat %tempBuildPath%\Corona%1Plugin %1
popd
rem === Move the zips to the published location
pushd ..\BuiltCorona\Corona%1Plugin
call build.bat
popd
goto :eof

:endWithPause
endlocal
echo DONE!
pause
