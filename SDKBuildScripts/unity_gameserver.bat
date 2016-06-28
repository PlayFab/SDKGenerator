pushd ..
if [%1] == [] (
rem === BUILDING Unity PlayFabGameServer ===
node generate.js ..\API_Specs csharp-unity-gameserver=..\sdks\PlayFabGameServer
) else (
rem === BUILDING Unity PlayFabGameServer with params %* ===
node generate.js ..\API_Specs csharp-unity-gameserver=..\sdks\PlayFabGameServer %*
)
popd
