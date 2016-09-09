@echo off
SetLocal EnableDelayedExpansion

REM ---------------------------------------------------------------------------
REM Validate args
REM ---------------------------------------------------------------------------

if "%1"=="" goto OnShowCommandLineHelp
if "%2"=="" goto OnShowCommandLineHelp

REM ---------------------------------------------------------------------------
REM Create Project
REM ---------------------------------------------------------------------------

REM Strip trailing \
set src=%~dp0
if %src:~-1%==\ set src=%src:~0,-1%

REM [Strip off double quotes with ~]
set dst=%~1

set name=%2

if exist "%dst%" (
	goto OnDstExistsError
) else (
	mkdir "%dst%"
	if NOT exist "%dst%" (
		goto OnDstExistsError
	)
)

REM [Copy into new project folder]
echo [copy]
xcopy "%src%" "%dst%" /I /S /EXCLUDE:.bat_ignore
xcopy "%src%\tmp\build.*" "%dst%" /y

REM [Rename]
echo.
echo [patch]
for /R "%dst%" %%F in (*PLUGIN_NAME*) do (
	set oldName=%%F
	set newName=!oldName:PLUGIN_NAME=%name%!
	move /Y "!oldName!" "!newName!" > nul
	echo Renamed !newName!
)
for /D /R "%dst%" %%F in (*PLUGIN_NAME*) do (
	set oldName=%%F
	set newName=!oldName:PLUGIN_NAME=%name%!
	move /Y "!oldName!" "!newName!" > nul
	echo Renamed !newName!
)

call :FindReplace PLUGIN_NAME %name% "%dst%"

echo.
echo [done]
echo SUCCESS: New project for ("%name%") located at ("%dst%").
goto :eof

REM ---------------------------------------------------------------------------
REM Subroutines
REM ---------------------------------------------------------------------------

:OnShowCommandLineHelp
echo Usage: %0 newProjectDir pluginName
exit /b 1

:OnDstExistsError
echo ERROR: %dst% already exists
exit /b 1

REM FindReplace <findstr> <replstr> <srcDir>
:FindReplace
set searchStr=%1
set replaceStr=%2
set srcDir=%~3

set tmpfile=%srcfile%-tmp

REM echo Using: %srcDir% %tmpfile%
REM echo "%searchStr%" "%replaceStr%"

REM Create helper for FindReplace
set vbsfile=%dst%\_.vbs
call :MakeReplace "%vbsfile%"

for /f "tokens=*" %%a in ('dir "%srcDir%" /s /b /a-d /on') do (
  for /f "usebackq" %%b in (`Findstr /mic:"%~1" "%%a"`) do (
    echo(&Echo Replacing "%~1" with "%~2" in file %%~nxa
    <%%a cscript //nologo %vbsfile% "%~1" "%~2" > "%tmpfile%"
    if exist "%tmpfile%" move /Y "%tmpfile%" "%%~dpnxa">nul
  )
)

REM Cleanup
del "%vbsfile%"

goto :eof


:MakeReplace
set var=%~1
>"%var%" echo with Wscript
>>"%var%" echo set args=.arguments
>>"%var%" echo .StdOut.Write _
>>"%var%" echo Replace(.StdIn.ReadAll,args(0),args(1),1,-1,1)
>>"%var%" echo end with
goto :eof
