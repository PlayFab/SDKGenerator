rem run-admin resets the bat file to c:\windows\system32, which is stupidly unsafe, and ...
rem we need to reset it back to the location of this bat file
cd %~dp0

rem use existing commitMessage variable if set, else use command line, else use "Automated checkin"
setlocal
if "%commitMessage%"=="" (if "%*" NEQ "" (set commitMessage=%*))
if "%commitMessage%"=="" (set commitMessage=Automated checkin)

call :doWork client
call :doWork server
call :doWork combo
goto :endWithPause

:doWork
set tempDir=C:\depot\sdks\store-hosted-playfab-%1
rmdir %tempDir%\plugins /S /Q
pushd Corona%1Plugin
7z x -o%tempDir% -y plugin-%1.zip
pushd %tempDir%
hg addremove
hg commit -m "%commitMessage%"
hg push
popd
popd
goto :eof

:endWithPause
endlocal
echo DONE!
pause
