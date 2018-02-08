pushd ..\..\sdks\PlayFabGameServer
attrib -H *.meta /S /D
popd

pushd ..
if [%1] == [] (
rem === BUILDING Unity PlayFabGameServer ===
node generate.js csharp-unity-gameserver=..\sdks\PlayFabGameServer -apiSpecGitUrl
) else (
rem === BUILDING Unity PlayFabGameServer with params %* ===
node generate.js csharp-unity-gameserver=..\sdks\PlayFabGameServer %*
)
popd

pause
