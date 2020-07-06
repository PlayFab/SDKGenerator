set destPath=..\sdks\%SdkName%
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

if ["%apiSpecSource%"] == [""] (
    set apiSpecSource=-apiSpecGitUrl
)

if defined NODE_NAME (
    set buildIdentifier=JBuild_%SdkName%_%NODE_NAME%_%EXECUTOR_NUMBER%
)

cd %~dp0
pushd ..
rem === BUILDING %SdkName% with params %* ===
node generate.js -destPath %destPath% %apiSpecSource% -buildIdentifier %buildIdentifier% %*
popd

pause
