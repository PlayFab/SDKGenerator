pushd ..\..\sdks\PlayFabGameServer
attrib -H *.meta /S /D
popd

pushd ..
if [%1] == [] (
rem === BUILDING Unity PlayFabGameServer ===
node generate.js ..\API_Specs csharp-unity-gameserver=..\sdks\PlayFabGameServer -buildIdentifier test_manual_build
) else (
rem === BUILDING Unity PlayFabGameServer with params %* ===
node generate.js ..\API_Specs csharp-unity-gameserver=..\sdks\PlayFabGameServer %*
)
popd

pause
