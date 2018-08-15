set destPath=..\sdks\%repoName%
pushd ..\%destPath%
if [%delSrc%] == [true] (
    del /S *.as
    del /S *.cpp
    del /S *.cs
    del /S *.h
    del /S *.java
    del /S *.js
    del /S *.lua
    del /S *.m
    del /S *.php
    del /S *.py
    del /S *.ts
    attrib -H *.meta /S /D
)
popd


if [%specSrc%] == [] (
    set specSrc=-apiSpecGitUrl
)

cd %~dp0
pushd ..
if [%1] == [] (
    rem === BUILDING %repoName% ===
    node generate.js %targetSrc%=%destPath% %flagsParams% %specSrc%
) else (
    rem === BUILDING %repoName% with params %* ===
    node generate.js %targetSrc%=%destPath% %*
)
popd

pause
