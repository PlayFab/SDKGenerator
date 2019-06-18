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
    for /f "usebackq delims=" %%d in (`"dir /ad/b/s | sort /R"`) do rd "%%d" 
)
popd

if ["%apiSpecSource%"] == [""] (
    set apiSpecSource=-apiSpecGitUrl
)

if defined NODE_NAME (
    set buildIdentifier=-buildIdentifier JBuild_%SdkName%_%NODE_NAME%_%EXECUTOR_NUMBER%
)

cd %~dp0
pushd ..
if [%1] == [] (
    rem === BUILDING %SdkName% ===
    node generate.js %targetSrc%=%destPath% %apiSpecSource% %SdkGenArgs% %buildIdentifier%
) else (
    rem === BUILDING %SdkName% with params %* ===
    node generate.js %targetSrc%=%destPath% %*
)
popd

if [%noPause%] == [false] (
    pause
)
