@echo off

REM Strip trailing \
set PATH_BAT=%~dp0
if %PATH_BAT:~-1%==\ set PATH_BAT=%PATH_BAT:~0,-1%

REM ---------------------------------------------------------------------------
REM Setup
REM ---------------------------------------------------------------------------

set BUILD_TARGET=2015.2642
if not "%1"=="" (
	set BUILD_TARGET="%1"
)

set BUILD_DIR=%PATH_BAT%\build
if not "%2"=="" (
	set BUILD_DIR="%2"
)

set LUAC="%PATH_BAT%\bin\luac.exe"
set BUILD_TARGET_VM="lua_51"
if not "%3"=="" (
	set BUILD_TARGET_VM="%3"
	set LUAC="%PATH_BAT%/bin/luac-%BUILD_TARGET_VM%"

	REM Verify that this VM is supported.
	if not exist "%LUAC%" (
		echo Error: Lua VM '%BUILD_TARGET_VM%' is not supported.
		exit -1
	)
)

set SevenZip="%PATH_BAT%\bin\7za.exe"

set LIBRARY_NAME=PLUGIN_NAME
set LIBRARY_TYPE="plugin"

set ZIP_PATH=%PATH_BAT%\plugin-%LIBRARY_NAME%.zip

REM Clean build
if exist "%BUILD_DIR%" (
	rmdir /s /q "%BUILD_DIR%"
)
if exist "%ZIP_PATH%" (
	del /q "%ZIP_PATH%"
)

REM Create directories
set BUILD_DIR_LUA=%BUILD_DIR%\plugins\%BUILD_TARGET%\lua\%BUILD_TARGET_VM%
mkdir "%BUILD_DIR_LUA%"

REM ---------------------------------------------------------------------------
REM Copy files over.
REM ---------------------------------------------------------------------------

echo [copy]
xcopy /I /S "%PATH_BAT%\lua\%LIBRARY_TYPE%" "%BUILD_DIR_LUA%\%LIBRARY_TYPE%" /EXCLUDE:.bat_ignore
copy "%PATH_BAT%\metadata.json" "%BUILD_DIR%\metadata.json"

REM ---------------------------------------------------------------------------
REM Compile lua files.
REM ---------------------------------------------------------------------------

echo.
echo [compile]
%LUAC% -v
For /R "%BUILD_DIR%" %%F in (*.lua) Do (
	echo Compiling %%F
	%LUAC% -s -o "%%F" -- "%%F"
)

REM ---------------------------------------------------------------------------
REM Zip up files.
REM ---------------------------------------------------------------------------

echo.
echo [zip]
pushd %BUILD_DIR%
echo 7-Zip (A) 9.20 Copyright (c) 1999-2010 Igor Pavlov 2010-11-18
%SevenZip% a -r -tzip -y "%ZIP_PATH%" * | FIND "Compressing"
popd

REM ---------------------------------------------------------------------------
REM Finish.
REM ---------------------------------------------------------------------------

echo.
echo [complete]
echo Plugin build succeeded.
echo Zip file located at: %ZIP_PATH%
