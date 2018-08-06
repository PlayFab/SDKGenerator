setlocal
set repoName=PlayFabGameServer
set destPath=..\sdks\%repoName%
pushd ..\%destPath%
del /S *.cs
attrib -H *.meta /S /D
popd

cd %~dp0
pushd ..
if [%1] == [] (
rem === BUILDING Unity PlayFabGameServer ===
node generate.js csharp-unity-gameserver=%destPath% -apiSpecGitUrl
) else (
rem === BUILDING Unity PlayFabGameServer with params %* ===
node generate.js csharp-unity-gameserver=%destPath% %*
)
popd

pause
endlocal
