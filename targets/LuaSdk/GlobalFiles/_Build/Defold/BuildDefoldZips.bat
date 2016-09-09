pushd PlayFabClientSdk
del /F /Q ..\..\..\Defold\PlayFabClientSdk.zip
copy /Y PlayFabSdk.project game.project
7z a ..\..\..\Defold\PlayFabClientSdk.zip ..\..\..\README.md PlayFab game.project
del /F /Q ..\..\..\Defold\PlayFabClientTestExample.zip
copy /Y PlayFabTestExample.project game.project
7z a ..\..\..\Defold\PlayFabClientTestExample.zip ..\..\..\README.md PlayFab PlayFabSdk.project PlayFabTesting game.project
popd

pushd PlayFabServerSdk
del /F /Q ..\..\..\Defold\PlayFabServerSdk.zip
copy /Y PlayFabSdk.project game.project
7z a ..\..\..\Defold\PlayFabServerSdk.zip ..\..\..\README.md PlayFab game.project
popd

pushd PlayFabSdk
del /F /Q ..\..\..\Defold\PlayFabComboSdk.zip
copy /Y PlayFabSdk.project game.project
7z a ..\..\..\Defold\PlayFabComboSdk.zip ..\..\..\README.md PlayFab game.project
popd

pause
