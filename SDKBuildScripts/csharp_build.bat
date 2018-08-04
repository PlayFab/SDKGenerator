setlocal
set repoName=CSharpSDK
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.cs
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING CSharpSDK ===
node generate.js csharp=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING CSharpSDK with params %* ===
node generate.js csharp=%destPath% %*
)
popd

pause
endlocal
